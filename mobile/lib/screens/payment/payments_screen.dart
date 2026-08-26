import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/payment.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<BeneficiaryProvider>();

      if (provider.beneficiary == null) {
        provider.loadBeneficiary();
      }
    });
  }

  Future<void> _refresh() async {
    await context.read<BeneficiaryProvider>().refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payments'),
      ),
      body: Consumer<BeneficiaryProvider>(
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
              message: 'No payment information available.',
              onRetry: _refresh,
            );
          }

          final payments = beneficiary.payments;

          if (payments.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 180),
                  Center(
                    child: Text(
                      'No payments have been recorded yet.',
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: payments.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: 12),
              itemBuilder: (context, index) {
                return _PaymentCard(
                  payment: payments[index],
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final Payment payment;

  const _PaymentCard({
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () {
          // We'll connect this to PaymentDetailsScreen next.
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      formatPaise(payment.amountPaise),
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  _StatusChip(
                    status: payment.status,
                  ),
                ],
              ),

              const SizedBox(height: 12),

              Text(
                'Reference',
                style: Theme.of(context)
                    .textTheme
                    .labelMedium,
              ),

              const SizedBox(height: 4),

              Text(
                payment.publicReference,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    formatDateTime(payment.createdAt),
                  ),
                ],
              ),

              if (payment.proof != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      payment.proof!.isValid
                          ? Icons.verified_outlined
                          : Icons.info_outline,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      payment.proof!.isValid
                          ? 'Ledger proof verified'
                          : 'Ledger proof unavailable',
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final PaymentStatus status;

  const _StatusChip({
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(
        paymentStatusLabel(status),
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