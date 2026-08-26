import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: () =>
              Navigator.of(context).pop(),
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.navy,
            size: 20,
          ),
        ),
        title: Text(
          l10n.helpSupport,
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
                '${l10n.helpSupport}. '
                '${l10n.helpIntroduction}. '
                '${l10n.commonQuestions}. '
                '${l10n.needMoreHelp}. '
                '${l10n.reliefCoordinator}.',
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
          const _IntroCard(),

          const SizedBox(height: 18),

          Text(
            l10n.commonQuestions,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 10),

          _FaqCard(
            question:
                l10n.faqPaymentStatusQuestion,
            answer:
                l10n.faqPaymentStatusAnswer,
          ),

          const SizedBox(height: 10),

          _FaqCard(
            question:
                l10n.faqPendingQuestion,
            answer:
                l10n.faqPendingAnswer,
          ),

          const SizedBox(height: 10),

          _FaqCard(
            question:
                l10n.faqSettledQuestion,
            answer:
                l10n.faqSettledAnswer,
          ),

          const SizedBox(height: 10),

          _FaqCard(
            question:
                l10n.faqFailedQuestion,
            answer:
                l10n.faqFailedAnswer,
          ),

          const SizedBox(height: 10),

          _FaqCard(
            question:
                l10n.faqMissingPaymentQuestion,
            answer:
                l10n.faqMissingPaymentAnswer,
          ),

          const SizedBox(height: 22),

          Text(
            l10n.needMoreHelp,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 10),

          const _ContactCard(),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.border,
        ),
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.support_agent_rounded,
            color: AppColors.primary,
            size: 28,
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Text(
              l10n.helpIntroduction,
              style: GoogleFonts.poppins(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqCard extends StatelessWidget {
  final String question;
  final String answer;

  const _FaqCard({
    required this.question,
    required this.answer,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(
          horizontal: 16,
        ),
        childrenPadding:
            const EdgeInsets.fromLTRB(
          16,
          0,
          16,
          16,
        ),
        iconColor: AppColors.primary,
        collapsedIconColor: AppColors.muted,
        title: Text(
          question,
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              answer,
              style: GoogleFonts.poppins(
                color: AppColors.muted,
                fontSize: 11.5,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius:
                  BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.person_outline_rounded,
              color: AppColors.primary,
            ),
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.reliefCoordinator,
                  style: GoogleFonts.poppins(
                    color: AppColors.navy,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 2),

                Text(
                  l10n.contactReliefCoordinator,
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 11,
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