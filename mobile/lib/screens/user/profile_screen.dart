import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: Consumer<BeneficiaryProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.beneficiary == null) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (provider.errorMessage != null &&
              provider.beneficiary == null) {
            return _ErrorView(
              message: provider.errorMessage!,
              onRetry: provider.loadBeneficiary,
            );
          }

          final beneficiary = provider.beneficiary;

          if (beneficiary == null) {
            return _ErrorView(
              message: 'No profile information available.',
              onRetry: provider.loadBeneficiary,
            );
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 12),

              CircleAvatar(
                radius: 42,
                child: Text(
                  beneficiary.name.isNotEmpty
                      ? beneficiary.name[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Center(
                child: Text(
                  beneficiary.name,
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),

              const SizedBox(height: 28),

              _ProfileCard(
                children: [
                  _InfoRow(
                    icon: Icons.person_outline,
                    label: 'Name',
                    value: beneficiary.name,
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'District',
                    value: beneficiary.districtCode,
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.volunteer_activism_outlined,
                    label: 'Scheme',
                    value: beneficiary.schemeName,
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.currency_rupee,
                    label: 'Promised Aid',
                    value: formatPaise(
                      beneficiary.promisedPaise,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.lock_outline,
                        size: 22,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Only information required for your '
                          'relief status is displayed here.',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final List<Widget> children;

  const _ProfileCard({
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: children,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
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