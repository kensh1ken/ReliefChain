import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class EligibilityScreen extends StatelessWidget {
  const EligibilityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      child: SafeArea(
        bottom: false,
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
                message:
                    AppLocalizations.of(context)!
                        .noEligibilityInformation,
                onRetry: provider.loadBeneficiary,
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(
                14,
                10,
                14,
                28,
              ),
              children: [
                _Header(
                  schemeName: beneficiary.schemeName,
                  districtCode: beneficiary.districtCode,
                  promisedPaise:
                      beneficiary.promisedPaise,
                ),
                const SizedBox(height: 12),
                _EligibilityCard(
                  schemeName: beneficiary.schemeName,
                ),
                const SizedBox(height: 12),
                _SchemeDetailsCard(
                  schemeName: beneficiary.schemeName,
                  districtCode:
                      beneficiary.districtCode,
                  promisedPaise:
                      beneficiary.promisedPaise,
                ),
                const SizedBox(height: 12),
                const _VerificationNote(),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String schemeName;
  final String districtCode;
  final int promisedPaise;

  const _Header({
    required this.schemeName,
    required this.districtCode,
    required this.promisedPaise,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Row(
      children: [
        IconButton(
          onPressed: () {
            Navigator.of(context).maybePop();
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
            l10n.eligibility,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),

        TtsButton(
          text:
              '${l10n.eligibilityStatus}. '
              '${l10n.eligible} for $schemeName. '
              '${l10n.district}: $districtCode. '
              '${l10n.totalAssistance}: '
              '${formatPaise(promisedPaise)}.',
        ),
      ],
    );
  }
}

class _EligibilityCard extends StatelessWidget {
  final String schemeName;

  const _EligibilityCard({
    required this.schemeName,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        18,
        22,
        18,
        20,
      ),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.success,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.check_rounded,
              color: Colors.white,
              size: 32,
            ),
          ),

          const SizedBox(height: 12),

          Text(
            l10n.youAreEligible,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 6),

          Text(
            l10n.reliefInformationAvailable,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.muted,
              fontSize: 11.5,
              height: 1.45,
            ),
          ),

          const SizedBox(height: 2),

          Text(
            schemeName,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SchemeDetailsCard extends StatelessWidget {
  final String schemeName;
  final String districtCode;
  final int promisedPaise;

  const _SchemeDetailsCard({
    required this.schemeName,
    required this.districtCode,
    required this.promisedPaise,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        14,
        16,
        14,
        12,
      ),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            l10n.schemeDetails,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 10),

          _DetailRow(
            label: l10n.schemeName,
            value: schemeName,
          ),

          _DetailRow(
            label: l10n.district,
            value: districtCode,
          ),

          _DetailRow(
            label: l10n.totalAssistance,
            value: formatPaise(promisedPaise),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 8,
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                color: AppColors.muted,
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          const SizedBox(width: 12),

          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.left,
              style: GoogleFonts.poppins(
                color: AppColors.navy,
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationNote extends StatelessWidget {
  const _VerificationNote();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

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
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.verified_user_outlined,
            color: AppColors.primary,
            size: 22,
          ),

          const SizedBox(width: 10),

          Expanded(
            child: Text(
              l10n.eligibilityVerificationNote,
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
    final l10n = AppLocalizations.of(context)!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 44,
              color: AppColors.muted,
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
                l10n.retry,
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