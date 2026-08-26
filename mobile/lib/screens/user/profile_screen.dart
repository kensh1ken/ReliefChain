import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/utils/colors.dart';

import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Consumer<BeneficiaryProvider>(
          builder: (context, provider, _) {
            if (provider.isLoading &&
                provider.beneficiary == null) {
              return const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                ),
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
              padding: const EdgeInsets.fromLTRB(
                20,
                10,
                20,
                30,
              ),
              children: [
                _Header(),

                const SizedBox(height: 24),

                _ProfileHeader(
                  name: beneficiary.name,
                ),

                const SizedBox(height: 24),

                _ProfileCard(
                  children: [
                    _InfoRow(
                      icon: Icons.person_outline_rounded,
                      label: 'Name',
                      value: beneficiary.name,
                    ),
                    const _Divider(),
                    _InfoRow(
                      icon: Icons.location_on_outlined,
                      label: 'District',
                      value: beneficiary.districtCode,
                    ),
                    const _Divider(),
                    _InfoRow(
                      icon: Icons.volunteer_activism_outlined,
                      label: 'Scheme',
                      value: beneficiary.schemeName,
                    ),
                    const _Divider(),
                    _InfoRow(
                      icon: Icons.currency_rupee_rounded,
                      label: 'Promised Aid',
                      value: formatPaise(
                        beneficiary.promisedPaise,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                _PrivacyCard(),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: () {
            Navigator.of(context).pop();
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(
            minWidth: 40,
            minHeight: 40,
          ),
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.navy,
            size: 20,
          ),
        ),
        Expanded(
          child: Text(
            'Profile',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 40),
      ],
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;

  const _ProfileHeader({
    required this.name,
  });

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty
        ? name[0].toUpperCase()
        : '?';

    return Column(
      children: [
        Container(
          width: 82,
          height: 82,
          decoration: const BoxDecoration(
            color: Color(0xFFE2E8F0),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              initial,
              style: GoogleFonts.poppins(
                color: AppColors.navy,
                fontSize: 30,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        Text(
          name,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),

        const SizedBox(height: 3),

        Text(
          'Beneficiary',
          style: GoogleFonts.poppins(
            color: AppColors.muted,
            fontSize: 12,
          ),
        ),
      ],
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: children,
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
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 15,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              icon,
              color: AppColors.primary,
              size: 20,
            ),
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),

                const SizedBox(height: 3),

                Text(
                  value,
                  style: GoogleFonts.poppins(
                    color: AppColors.navy,
                    fontSize: 12.5,
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

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 66),
      child: Divider(
        height: 1,
        color: AppColors.divider,
      ),
    );
  }
}

class _PrivacyCard extends StatelessWidget {
  const _PrivacyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.border,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.lock_outline_rounded,
            color: AppColors.primary,
            size: 21,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Only information required for your '
              'relief status is displayed here.',
              style: GoogleFonts.poppins(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w500,
                height: 1.45,
              ),
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
              Icons.cloud_off_rounded,
              color: AppColors.muted,
              size: 44,
            ),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: AppColors.navy,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              child: Text(
                'Retry',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}