import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/screens/user/eligibility_screen.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../models/payment.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';
import '../help/help_support_screen.dart';
import '../payment/payment_details_screen.dart';

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
    final l10n =
        AppLocalizations.of(context)!;

    return Container(
  color: AppColors.background,
  child: SafeArea(
    bottom: false,
    child: Stack(
      children: [
        Positioned(
          top: -100,
          left: 0,
          right: 0,
          height: 600,
          child: IgnorePointer(
            child: Opacity(
              opacity: 0.9,
              child: Image.asset(
                'assets/bridge.png',
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
              ),
            ),
          ),
        ),

        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.center,
                  colors: [
                    Colors.transparent,
                    AppColors.background.withOpacity(0.85),
                  ],
                ),
              ),
            ),
          ),
        ),

        Consumer<BeneficiaryProvider>(
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
                message:
                    l10n.noBeneficiaryData,
                onRetry: _refresh,
              );
            }

            final payments =
                beneficiary.payments;

            final Payment? latestPayment =
                payments.isEmpty
                    ? null
                    : payments.first;

            final settledPayments =
                payments.where(
              (payment) =>
                  payment.status ==
                  PaymentStatus.settled,
            );

            final int totalReceivedPaise =
                settledPayments.fold<int>(
              0,
              (sum, payment) =>
                  sum + payment.amountPaise,
            );

            final int receivedCount =
                settledPayments.length;

            return RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.primary,
              child: ListView(
                physics:
                    const AlwaysScrollableScrollPhysics(),
                padding:
                    const EdgeInsets.fromLTRB(
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
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              const EligibilityScreen(),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 14),

                  if (latestPayment != null)
                    _LatestPaymentCard(
                      payment: latestPayment,
                      l10n: l10n,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                PaymentDetailsScreen(
                              payment:
                                  latestPayment,
                              schemeName:
                                  beneficiary
                                      .schemeName,
                            ),
                          ),
                        );
                      },
                    ),

                  const SizedBox(height: 22),

                  _PaymentOverviewCard(
                    totalReceivedPaise:
                        totalReceivedPaise,
                    receivedCount:
                        receivedCount,
                    promisedPaise:
                        beneficiary.promisedPaise,
                    latestPayment:
                        latestPayment,
                    l10n: l10n,
                  ),

                  const SizedBox(height: 18),

                  _HelpCard(
                    l10n: l10n,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              const HelpSupportScreen(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ],
    )
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
              '${l10n.reliefDashboard}. '
              '${l10n.eligibilityStatus}. '
              '${l10n.latestPayment}.',
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
      color:
          AppColors.white.withOpacity(0.88),
      borderRadius:
          BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(13),
        child: const SizedBox(
          width: 44,
          height: 44,
          child: Icon(
            Icons.menu_rounded,
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
          '${l10n.helloUser(name)}!',
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
            color: AppColors.navy.withOpacity(0.75),
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _EligibilityCard
    extends StatelessWidget {
  final String schemeName;
  final String districtCode;
  final AppLocalizations l10n;
  final VoidCallback onTap;

  const _EligibilityCard({
    required this.schemeName,
    required this.districtCode,
    required this.l10n,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius:
          BorderRadius.circular(18),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(18),
        child: Padding(
          padding:
              const EdgeInsets.fromLTRB(
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
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.muted,
                        fontSize: 12,
                        fontWeight:
                            FontWeight.w500,
                      ),
                    ),

                    const SizedBox(height: 9),

                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration:
                              BoxDecoration(
                            color: AppColors
                                .primaryLight,
                            borderRadius:
                                BorderRadius
                                    .circular(
                              10,
                            ),
                          ),
                          child: const Icon(
                            Icons
                                .verified_rounded,
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
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.navy,
                        fontSize: 12,
                        fontWeight:
                            FontWeight.w600,
                      ),
                    ),

                    const SizedBox(height: 2),

                    Text(
                      districtCode,
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.muted,
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
  final VoidCallback onTap;

  const _LatestPaymentCard({
    required this.payment,
    required this.l10n,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary,
      borderRadius:
          BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(18),
        child: Padding(
          padding:
              const EdgeInsets.fromLTRB(
            18,
            16,
            16,
            17,
          ),
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Text(
                l10n.latestPayment,
                style: GoogleFonts.poppins(
                  color: AppColors.white
                      .withOpacity(0.78),
                  fontSize: 12,
                  fontWeight:
                      FontWeight.w500,
                ),
              ),

              const SizedBox(height: 7),

              Row(
                children: [
                  Expanded(
                    child: Text(
                      formatPaise(
                        payment.amountPaise,
                      ),
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.white,
                        fontSize: 27,
                        fontWeight:
                            FontWeight.w700,
                        letterSpacing: -0.6,
                      ),
                    ),
                  ),

                  _StatusBadge(
                    status:
                        payment.status,
                    l10n: l10n,
                  ),
                ],
              ),

              const SizedBox(height: 4),

              Text(
                '${l10n.createdOn}: '
                '${formatDateTime(
                  payment.createdAt,
                )}',
                style: GoogleFonts.poppins(
                  color: AppColors.white
                      .withOpacity(0.78),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge
    extends StatelessWidget {
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
    final String label;

    switch (status) {
      case PaymentStatus.pending:
        background =
            AppColors.pendingBackground;
        foreground =
            AppColors.pending;
        label = l10n.pending;

      case PaymentStatus.settled:
        background =
            AppColors.successBackground;
        foreground =
            AppColors.success;
        label = l10n.received;

      case PaymentStatus.failed:
        background =
            AppColors.failedBackground;
        foreground =
            AppColors.failed;
        label = l10n.failed;

      case PaymentStatus.reversed:
        background =
            AppColors.reversedBackground;
        foreground =
            AppColors.reversed;
        label = l10n.reversed;

      case PaymentStatus.unknown:
        background =
            AppColors.unknownBackground;
        foreground =
            AppColors.unknown;
        label = l10n.unknown;
    }

    return Container(
      padding:
          const EdgeInsets.symmetric(
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
          fontWeight:
              FontWeight.w600,
        ),
      ),
    );
  }
}

class _PaymentOverviewCard
    extends StatelessWidget {
  final int totalReceivedPaise;
  final int receivedCount;
  final int promisedPaise;
  final Payment? latestPayment;
  final AppLocalizations l10n;

  const _PaymentOverviewCard({
    required this.totalReceivedPaise,
    required this.receivedCount,
    required this.promisedPaise,
    required this.latestPayment,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.fromLTRB(
        14,
        16,
        14,
        16,
      ),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius:
            BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            l10n.latestPayment,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 16,
              fontWeight:
                  FontWeight.w700,
            ),
          ),

          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: _OverviewItem(
                  icon:
                      Icons.currency_rupee_rounded,
                  value: formatPaise(
                    totalReceivedPaise,
                  ),
                  label: l10n.received,
                  iconColor:
                      AppColors.success,
                  iconBackground:
                      AppColors.successBackground,
                ),
              ),

              const _VerticalDivider(),

              Expanded(
                child: _OverviewItem(
                  icon:
                      Icons.receipt_long_rounded,
                  value:
                      receivedCount.toString(),
                  label: l10n.payments,
                  iconColor:
                      AppColors.primary,
                  iconBackground:
                      AppColors.primaryLight,
                ),
              ),

              const _VerticalDivider(),

              Expanded(
                child: _OverviewItem(
                  icon:
                      Icons.account_balance_wallet_rounded,
                  value: formatPaise(
                    promisedPaise,
                  ),
                  label:
                      l10n.totalAssistance,
                  iconColor:
                      AppColors.navy,
                  iconBackground:
                      AppColors.backgroundLight,
                ),
              ),

              const _VerticalDivider(),

              Expanded(
                child: _OverviewItem(
                  icon:
                      Icons.circle_outlined,
                  value:
                      latestPayment == null
                          ? '—'
                          : _statusText(
                              latestPayment!
                                  .status,
                              l10n,
                            ),
                  label: l10n.status,
                  iconColor:
                      AppColors.muted,
                  iconBackground:
                      AppColors.background,
                  compact: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _statusText(
    PaymentStatus status,
    AppLocalizations l10n,
  ) {
    switch (status) {
      case PaymentStatus.pending:
        return l10n.pending;
      case PaymentStatus.settled:
        return l10n.received;
      case PaymentStatus.failed:
        return l10n.failed;
      case PaymentStatus.reversed:
        return l10n.reversed;
      case PaymentStatus.unknown:
        return l10n.unknown;
    }
  }
}

class _OverviewItem
    extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color iconColor;
  final Color iconBackground;
  final bool compact;

  const _OverviewItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.iconColor,
    required this.iconBackground,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration:
              BoxDecoration(
            color: iconBackground,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: iconColor,
            size: 20,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          value,
          maxLines: 1,
          overflow:
              TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize:
                compact ? 11 : 12,
            fontWeight:
                FontWeight.w700,
          ),
        ),

        const SizedBox(height: 3),

        Text(
          label,
          maxLines: 2,
          overflow:
              TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: AppColors.muted,
            fontSize: 9.5,
            height: 1.2,
          ),
        ),
      ],
    );
  }
}

class _VerticalDivider
    extends StatelessWidget {
  const _VerticalDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 86,
      color: AppColors.divider,
    );
  }
}

class _HelpCard
    extends StatelessWidget {
  final AppLocalizations l10n;
  final VoidCallback onTap;

  const _HelpCard({
    required this.l10n,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primaryLight,
      borderRadius:
          BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(16),
        child: Padding(
          padding:
              const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration:
                    const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.support_agent_rounded,
                  color:
                      AppColors.primary,
                  size: 23,
                ),
              ),

              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.helpSupport,
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.navy,
                        fontSize: 12,
                        fontWeight:
                            FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l10n.helpIntroduction,
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.muted,
                        fontSize: 10.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),

              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.navy,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorView
    extends StatelessWidget {
  final String message;
  final Future<void> Function()
      onRetry;

  const _ErrorView({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final l10n =
        AppLocalizations.of(context)!;

    return Center(
      child: Padding(
        padding:
            const EdgeInsets.all(24),
        child: Column(
          mainAxisSize:
              MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 44,
              color: AppColors.muted,
            ),

            const SizedBox(height: 14),

            Text(
              message,
              textAlign:
                  TextAlign.center,
              style:
                  GoogleFonts.poppins(
                color:
                    AppColors.navy,
                fontSize: 14,
              ),
            ),

            const SizedBox(height: 16),

            FilledButton(
              onPressed: onRetry,
              child: Text(
                l10n.retry,
                style:
                    GoogleFonts.poppins(
                  fontWeight:
                      FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}