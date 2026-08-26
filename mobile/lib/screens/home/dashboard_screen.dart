import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/payment.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BeneficiaryProvider>().loadBeneficiary();
    });
  }

  Future<void> _refresh() async {
    await context.read<BeneficiaryProvider>().refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<BeneficiaryProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading &&
            provider.beneficiary == null) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        if (provider.errorMessage != null &&
            provider.beneficiary == null) {
          return _ErrorView(
            message: provider.errorMessage!,
            onRetry: _refresh,
          );
        }

        final beneficiary = provider.beneficiary;

        if (beneficiary == null) {
          return _ErrorView(
            message: 'No beneficiary data available.',
            onRetry: _refresh,
          );
        }

        final payments = beneficiary.payments;

        final Payment? latestPayment =
            payments.isEmpty ? null : payments.first;

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
            children: [
              Text(
                'Hello, ${beneficiary.name}',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),

              const SizedBox(height: 6),

              const Text(
                'Here’s your relief dashboard',
              ),

              const SizedBox(height: 24),

              _EligibilityCard(
                schemeName: beneficiary.schemeName,
                districtCode: beneficiary.districtCode,
              ),

              const SizedBox(height: 16),

              if (latestPayment != null)
                _LatestPaymentCard(
                  payment: latestPayment,
                ),

              const SizedBox(height: 24),

              Text(
                'Quick Actions',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.payments_outlined,
                      label: 'Payments',
                      onTap: () {
                        // Home shell will handle this later.
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.verified_outlined,
                      label: 'Eligibility',
                      onTap: () {
                        // Home shell will handle this later.
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.notifications_none,
                      label: 'Updates',
                      onTap: () {},
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.help_outline,
                      label: 'Help',
                      onTap: () {},
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _EligibilityCard extends StatelessWidget {
  final String schemeName;
  final String districtCode;

  const _EligibilityCard({
    required this.schemeName,
    required this.districtCode,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'Eligibility Status',
              style: Theme.of(context)
                  .textTheme
                  .labelLarge,
            ),

            const SizedBox(height: 10),

            Row(
              children: [
                Icon(
                  Icons.check_circle,
                  color: Colors.green.shade600,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Eligible',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            Text(
              schemeName,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 4),

            Text(districtCode),
          ],
        ),
      ),
    );
  }
}

class _LatestPaymentCard extends StatelessWidget {
  final Payment payment;

  const _LatestPaymentCard({
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'Latest Payment',
              style: Theme.of(context)
                  .textTheme
                  .labelLarge,
            ),

            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: Text(
                    formatPaise(payment.amountPaise),
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                Chip(
                  label: Text(
                    paymentStatusLabel(
                      payment.status,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            Text(
              'Initiated on ${formatDateTime(payment.createdAt)}',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(
          vertical: 18,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
      child: Column(
        children: [
          Icon(icon),
          const SizedBox(height: 6),
          Text(label),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _ErrorView({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}