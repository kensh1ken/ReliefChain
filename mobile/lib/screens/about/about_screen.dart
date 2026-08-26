import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.navy,
            size: 20,
          ),
        ),
        title: Text(
          l10n.aboutReliefChain,
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        actions: [
          TtsButton(
            text:
                '${l10n.aboutReliefChain}. '
                '${l10n.whatIsReliefChain}. '
                '${l10n.reliefChainDescription}. '
                '${l10n.transparency}. '
                '${l10n.transparencyDescription}. '
                '${l10n.privacySection}. '
                '${l10n.privacyDescription}.',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          20,
          8,
          20,
          30,
        ),
        children: [
          const SizedBox(height: 10),

          const _BrandCard(),

          const SizedBox(height: 20),

          _InfoSection(
            title: l10n.whatIsReliefChain,
            text: l10n.reliefChainDescription,
          ),

          const SizedBox(height: 12),

          _InfoSection(
            title: l10n.transparency,
            text: l10n.transparencyDescription,
          ),

          const SizedBox(height: 12),

          _InfoSection(
            title: l10n.privacySection,
            text: l10n.privacyDescription,
          ),

          const SizedBox(height: 24),

          Center(
            child: Column(
              children: [
                Text(
                  'ReliefChain',
                  style: GoogleFonts.poppins(
                    color: AppColors.navy,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),

                const SizedBox(height: 3),

                Text(
                  l10n.directAidTransparentImpact,
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 11,
                  ),
                ),

                const SizedBox(height: 8),

                Text(
                  l10n.version('1.0.0'),
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 10,
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

class _BrandCard extends StatelessWidget {
  const _BrandCard();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.symmetric(
        vertical: 24,
        horizontal: 18,
      ),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.border,
              ),
            ),
            child: const Icon(
              Icons.water_drop_rounded,
              size: 34,
              color: AppColors.primary,
            ),
          ),

          const SizedBox(height: 12),

          Text(
            'ReliefChain',
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 4),

          Text(
            l10n.directAidTransparentImpact,
            style: GoogleFonts.poppins(
              color: AppColors.muted,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final String text;

  const _InfoSection({
    required this.title,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 7),

          Text(
            text,
            style: GoogleFonts.poppins(
              color: AppColors.muted,
              fontSize: 11.5,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}