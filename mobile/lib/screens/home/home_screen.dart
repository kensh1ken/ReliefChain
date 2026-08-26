import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/payment.dart';
import '../../providers/auth_provider.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';
import '../auth/login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BeneficiaryProvider>().loadBeneficiary();
    });
  }

  Future<void> _logout() async {
    await context.read<AuthProvider>().logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
      (route) => false,
    );
  }

  Future<void> _refresh() async {
    await context.read<BeneficiaryProvider>().refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ReliefChain'),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Consumer<BeneficiaryProvider>(
        builder: (context, provider, _) {
          // Initial loading
          if (provider.isLoading && provider.beneficiary == null) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          // No data + error
          if (provider.errorMessage != null &&
              provider.beneficiary == null) {
            return _ErrorView(
              message: provider.errorMessage!,
              onRetry: _refresh,
            );
          }

          final beneficiary = provider.beneficiary;

          // No data and no error
          if (beneficiary == null) {
            return _ErrorView(
              message: 'No beneficiary data available.',
              onRetry: _refresh,
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Welcome, ${beneficiary.name}',
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),

                const SizedBox(height: 8),

                Text(
                  'Your relief information',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),

                const SizedBox(height: 24),

                _InfoCard(
                  title: 'Scheme',
                  value: beneficiary.schemeName,
                  icon: Icons.volunteer_activism_outlined,
                ),

                const SizedBox(height: 12),

                _InfoCard(
                  title: 'District',
                  value: beneficiary.districtCode,
                  icon: Icons.location_on_outlined,
                ),

                const SizedBox(height: 12),

                _InfoCard(
                  title: 'Promised Aid',
                  value: formatPaise(
                    beneficiary.promisedPaise,
                  ),
                  icon: Icons.currency_rupee,
                ),

                const SizedBox(height: 24),

                Text(
                  'Payments',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),

                const SizedBox(height: 12),

                if (beneficiary.payments.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text(
                        'No payments have been recorded yet.',
                      ),
                    ),
                  )
                else
                  ...beneficiary.payments.map(
                    (payment) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _PaymentCard(
                        payment: payment,
                      ),
                    ),
                  ),

                if (provider.errorMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    provider.errorMessage!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _InfoCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
          ),
        ),
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
    final status = payment.status;

    return Card(
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
                  status: status,
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

            Text(
              'Created',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium,
            ),

            const SizedBox(height: 4),

            Text(
              formatDateTime(payment.createdAt),
            ),

            if (payment.proof != null) ...[
              const SizedBox(height: 16),

              const Divider(),

              const SizedBox(height: 8),

              Row(
                children: [
                  const Icon(
                    Icons.verified_outlined,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      payment.proof!.isValid
                          ? 'Ledger proof valid'
                          : 'Ledger proof unavailable',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
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