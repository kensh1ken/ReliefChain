import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../models/payment.dart';
import '../../providers/beneficiary_provider.dart';
import '../../utils/formatters.dart';
import 'payment_details_screen.dart';

enum PaymentFilter {
  all,
  received,
  pending,
  failed,
}

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  PaymentFilter _selectedFilter = PaymentFilter.all;

  Future<void> _refresh() async {
    await context.read<BeneficiaryProvider>().refresh();
  }

  List<Payment> _filteredPayments(List<Payment> payments) {
    switch (_selectedFilter) {
      case PaymentFilter.all:
        return payments;

      case PaymentFilter.received:
        return payments
            .where(
              (payment) =>
                  payment.status == PaymentStatus.settled,
            )
            .toList();

      case PaymentFilter.pending:
        return payments
            .where(
              (payment) =>
                  payment.status == PaymentStatus.pending,
            )
            .toList();

      case PaymentFilter.failed:
        return payments
            .where(
              (payment) =>
                  payment.status == PaymentStatus.failed,
            )
            .toList();
    }
  }

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
                onRetry: _refresh,
              );
            }

            final beneficiary = provider.beneficiary;

            if (beneficiary == null) {
              return _ErrorView(
                message:
                    'No payment information available.',
                onRetry: _refresh,
              );
            }

            final payments = _filteredPayments(
              beneficiary.payments,
            );

            final receivedPaise = beneficiary.payments
                .where(
                  (payment) =>
                      payment.status ==
                      PaymentStatus.settled,
                )
                .fold<int>(
                  0,
                  (sum, payment) =>
                      sum + payment.amountPaise,
                );

            return RefreshIndicator(
              onRefresh: _refresh,
              color: AppColors.primary,
              child: CustomScrollView(
                physics:
                    const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      20,
                      12,
                      20,
                      0,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _Header(
                        receivedPaise: receivedPaise,
                      ),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      20,
                      20,
                      20,
                      0,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _FilterBar(
                        selectedFilter: _selectedFilter,
                        onChanged: (filter) {
                          setState(() {
                            _selectedFilter = filter;
                          });
                        },
                      ),
                    ),
                  ),

                  if (payments.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: _EmptyState(
                        filter: _selectedFilter,
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        16,
                        16,
                        16,
                        30,
                      ),
                      sliver:
                          SliverList.separated(
                        itemCount: payments.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(
                          height: 10,
                        ),
                        itemBuilder:
                            (context, index) {
                          return _PaymentCard(
                            payment: payments[index],
                            schemeName:
                                beneficiary.schemeName,
                          );
                        },
                      ),
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

class _Header extends StatelessWidget {
  final int receivedPaise;

  const _Header({
    required this.receivedPaise,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const _HeaderButton(
          icon: Icons.menu_rounded,
        ),

        const Spacer(),

        Text(
          'Payments',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),

        const Spacer(),

        TtsButton(
          text:
              'Your payment history. '
              'You have received '
              '${formatPaise(receivedPaise)} '
              'in settled relief payments.',
        ),
      ],
    );
  }
}

class _HeaderButton extends StatelessWidget {
  final IconData icon;

  const _HeaderButton({
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(
            icon,
            color: AppColors.navy,
            size: 22,
          ),
        ),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final PaymentFilter selectedFilter;
  final ValueChanged<PaymentFilter> onChanged;

  const _FilterBar({
    required this.selectedFilter,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _FilterChip(
            label: 'All',
            selected:
                selectedFilter == PaymentFilter.all,
            onTap: () =>
                onChanged(PaymentFilter.all),
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _FilterChip(
            label: 'Received',
            selected:
                selectedFilter ==
                    PaymentFilter.received,
            onTap: () =>
                onChanged(PaymentFilter.received),
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _FilterChip(
            label: 'Pending',
            selected:
                selectedFilter ==
                    PaymentFilter.pending,
            onTap: () =>
                onChanged(PaymentFilter.pending),
          ),
        ),

        const SizedBox(width: 8),

        Expanded(
          child: _FilterChip(
            label: 'Failed',
            selected:
                selectedFilter ==
                    PaymentFilter.failed,
            onTap: () =>
                onChanged(PaymentFilter.failed),
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary
          : Colors.white.withOpacity(0.55),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          height: 40,
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                color: selected
                    ? Colors.white
                    : AppColors.navy,
                fontSize: 11,
                fontWeight: selected
                    ? FontWeight.w600
                    : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final Payment payment;
  final String schemeName;

  const _PaymentCard({
    required this.payment,
    required this.schemeName,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => PaymentDetailsScreen(
                payment: payment,
                schemeName: schemeName,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            16,
            14,
            16,
            13,
          ),
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      schemeName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: AppColors.navy,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),

                  _StatusBadge(
                    status: payment.status,
                  ),
                ],
              ),

              const SizedBox(height: 7),

              Text(
                formatPaise(payment.amountPaise),
                style: GoogleFonts.poppins(
                  color: AppColors.navy,
                  fontSize: 23,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 6),

              Text(
                '${_formatShortDate(payment.createdAt)}  •  '
                '${payment.publicReference}',
                style: GoogleFonts.poppins(
                  color: AppColors.muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatShortDate(DateTime date) {
    final local = date.toLocal();

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return '${local.day.toString().padLeft(2, '0')} '
        '${months[local.month - 1]} '
        '${local.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  final PaymentStatus status;

  const _StatusBadge({
    required this.status,
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

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius:
            BorderRadius.circular(9),
      ),
      child: Text(
        paymentStatusLabel(status),
        style: GoogleFonts.poppins(
          color: foreground,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final PaymentFilter filter;

  const _EmptyState({
    required this.filter,
  });

  String get message {
    switch (filter) {
      case PaymentFilter.all:
        return 'No payments have been recorded yet.';

      case PaymentFilter.received:
        return 'No received payments.';

      case PaymentFilter.pending:
        return 'No pending payments.';

      case PaymentFilter.failed:
        return 'No failed payments.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: AppColors.muted,
            fontSize: 14,
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