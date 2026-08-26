import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../models/payment.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() =>
      _DashboardScreenState();
}

class _DashboardScreenState
    extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider =
          context.read<BeneficiaryProvider>();

      if (provider.beneficiary == null) {
        provider.loadBeneficiary();
      }
    });
  }

  Future<void> _refresh() async {
    await context
        .read<BeneficiaryProvider>()
        .refresh();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

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
                onRetry: _refresh,
              );
            }

            final beneficiary =
                provider.beneficiary;

            if (beneficiary == null) {
              return _ErrorView(
                message: l10n.noBeneficiaryData,
                onRetry: _refresh,
              );
            }

            final payments = beneficiary.payments;

            final Payment? latestPayment =
                payments.isEmpty
                    ? null
                    : payments.first;

            return RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.primary,
              child: ListView(
                physics:
                    const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  20,
                  10,
                  20,
                  30,
                ),
                children: [
                  _TopBar(
                    l10n: l10n,
                  ),

                  const SizedBox(height: 22),

                  _Greeting(
                    name: beneficiary.name,
                    l10n: l10n,
                  ),

                  const SizedBox(height: 24),

                  _EligibilityCard(
                    schemeName:
                        beneficiary.schemeName,
                    districtCode:
                        beneficiary.districtCode,
                    l10n: l10n,
                  ),

                  const SizedBox(height: 14),

                  if (latestPayment != null)
                    _LatestPaymentCard(
                      payment: latestPayment,
                      l10n: l10n,
                    ),

                  const SizedBox(height: 22),

                  Text(
                    l10n.quickActions,
                    style: GoogleFonts.poppins(
                      color: AppColors.navy,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: 10),

                  _QuickActions(
                    l10n: l10n,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final AppLocalizations l10n;

  const _TopBar({
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _TopButton(
          icon: Icons.menu_rounded,
          onTap: () {},
        ),

        const Spacer(),

        TtsButton(
          text:
              '${l10n.helloUser('')}. '
              '${l10n.reliefDashboard}. '
              '${l10n.eligibilityStatus}, '
              '${l10n.latestPayment}, '
              '${l10n.quickActions}.',
        ),
      ],
    );
  }
}

class _TopButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _TopButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white.withOpacity(0.88),
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(
            icon,
            size: 22,
            color: AppColors.navy,
          ),
        ),
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  final String name;
  final AppLocalizations l10n;

  const _Greeting({
    required this.name,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Text(
          '${l10n.helloUser(name)} 👋',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 25,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
            height: 1.15,
          ),
        ),

        const SizedBox(height: 4),

        Text(
          l10n.reliefDashboard,
          style: GoogleFonts.poppins(
            color: AppColors.muted,
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _EligibilityCard extends StatelessWidget {
  final String schemeName;
  final String districtCode;
  final AppLocalizations l10n;

  const _EligibilityCard({
    required this.schemeName,
    required this.districtCode,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(18),
      elevation: 0,
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            18,
            17,
            14,
            17,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.eligibilityStatus,
                      style: GoogleFonts.poppins(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),

                    const SizedBox(height: 9),

                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color:
                                AppColors.primaryLight,
                            borderRadius:
                                BorderRadius.circular(
                              10,
                            ),
                          ),
                          child: const Icon(
                            Icons.verified_rounded,
                            color:
                                AppColors.primary,
                            size: 21,
                          ),
                        ),

                        const SizedBox(width: 9),

                        Text(
                          l10n.eligible,
                          style:
                              GoogleFonts.poppins(
                            color:
                                AppColors.navy,
                            fontSize: 19,
                            fontWeight:
                                FontWeight.w700,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 11),

                    Text(
                      schemeName,
                      style: GoogleFonts.poppins(
                        color: AppColors.navy,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),

                    const SizedBox(height: 2),

                    Text(
                      districtCode,
                      style: GoogleFonts.poppins(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.navy,
                size: 23,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LatestPaymentCard
    extends StatelessWidget {
  final Payment payment;
  final AppLocalizations l10n;

  const _LatestPaymentCard({
    required this.payment,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        18,
        16,
        16,
        17,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            l10n.latestPayment,
            style: GoogleFonts.poppins(
              color:
                  AppColors.white.withOpacity(0.78),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),

          const SizedBox(height: 7),

          Row(
            children: [
              Expanded(
                child: Text(
                  formatPaise(payment.amountPaise),
                  style: GoogleFonts.poppins(
                    color: AppColors.white,
                    fontSize: 27,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.6,
                  ),
                ),
              ),

              _StatusBadge(
                status: payment.status,
                l10n: l10n,
              ),
            ],
          ),

          const SizedBox(height: 4),

          Text(
            'Initiated on '
            '${formatDateTime(payment.createdAt)}',
            style: GoogleFonts.poppins(
              color:
                  AppColors.white.withOpacity(0.78),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final PaymentStatus status;
  final AppLocalizations l10n;

  const _StatusBadge({
    required this.status,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    final Color background;
    final Color foreground;

    switch (status) {
      case PaymentStatus.pending:
        background =
            AppColors.pendingBackground;
        foreground = AppColors.pending;

      case PaymentStatus.settled:
        background =
            AppColors.successBackground;
        foreground = AppColors.success;

      case PaymentStatus.failed:
        background =
            AppColors.failedBackground;
        foreground = AppColors.failed;

      case PaymentStatus.reversed:
        background =
            AppColors.reversedBackground;
        foreground = AppColors.reversed;

      case PaymentStatus.unknown:
        background =
            AppColors.unknownBackground;
        foreground = AppColors.unknown;
    }

    final String label;

    switch (status) {
      case PaymentStatus.pending:
        label = l10n.pending;

      case PaymentStatus.settled:
        label = l10n.received;

      case PaymentStatus.failed:
        label = l10n.failed;

      case PaymentStatus.reversed:
        label = l10n.reversed;

      case PaymentStatus.unknown:
        label = l10n.unknown;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 11,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius:
            BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  final AppLocalizations l10n;

  const _QuickActions({
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.payments_outlined,
            label: l10n.payments,
            onTap: () {},
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _QuickActionCard(
            icon: Icons.verified_outlined,
            label: l10n.eligibility,
            onTap: () {},
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _QuickActionCard(
            icon:
                Icons.notifications_none_rounded,
            label: l10n.updates,
            onTap: () {},
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _QuickActionCard(
            icon: Icons.help_outline_rounded,
            label: l10n.help,
            onTap: () {},
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard
    extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: SizedBox(
          height: 88,
          child: Column(
            mainAxisAlignment:
                MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: AppColors.primary,
                size: 23,
              ),

              const SizedBox(height: 7),

              Text(
                label,
                style: GoogleFonts.poppins(
                  color: AppColors.navy,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
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