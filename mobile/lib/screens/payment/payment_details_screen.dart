import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:reliefchain/utils/colors.dart';

import '../../models/payment.dart';
import '../../utils/formatters.dart';

class PaymentDetailsScreen extends StatelessWidget {
  final Payment payment;

  const PaymentDetailsScreen({
    super.key,
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
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
          'Payment Details',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            _PaymentHeader(payment: payment),

            const SizedBox(height: 12),

            _PaymentInformation(payment: payment),

            const SizedBox(height: 12),

            _VerificationCard(payment: payment),
          ],
        ),
      ),
    );
  }
}

class _PaymentHeader extends StatelessWidget {
  final Payment payment;

  const _PaymentHeader({
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 14, 16),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  formatPaise(payment.amountPaise),
                  style: GoogleFonts.poppins(
                    color: AppColors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              _StatusBadge(
                status: payment.status,
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            'Flood Relief Scheme 2024',
            style: GoogleFonts.poppins(
              color: AppColors.white.withOpacity(0.88),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentInformation extends StatelessWidget {
  final Payment payment;

  const _PaymentInformation({
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    return _WhiteCard(
      child: Column(
        children: [
          _DetailRow(
            label: 'Public Reference',
            value: payment.publicReference,
          ),
          _DetailRow(
            label: 'Status',
            value: paymentStatusLabel(payment.status),
          ),
          if (payment.bankReference != null &&
              payment.bankReference!.isNotEmpty)
            _DetailRow(
              label: 'Bank Reference',
              value: payment.bankReference!,
            ),
          _DetailRow(
            label: 'Created On',
            value: _formatDateTime(payment.createdAt),
          ),
          _DetailRow(
            label: 'Last Updated',
            value: _formatDateTime(payment.updatedAt),
            showDivider: false,
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();

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

    final hour = local.hour == 0
        ? 12
        : local.hour > 12
            ? local.hour - 12
            : local.hour;

    final minute = local.minute.toString().padLeft(2, '0');

    final period = local.hour >= 12 ? 'PM' : 'AM';

    return '${local.day.toString().padLeft(2, '0')} '
        '${months[local.month - 1]} '
        '${local.year}, '
        '$hour:$minute $period';
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool showDivider;

  const _DetailRow({
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            vertical: 8,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Flexible(
                child: Text(
                  value,
                  textAlign: TextAlign.right,
                  style: GoogleFonts.poppins(
                    color: AppColors.navy,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          const Divider(
            height: 1,
            color: AppColors.divider,
          ),
      ],
    );
  }
}

class _VerificationCard extends StatelessWidget {
  final Payment payment;

  const _VerificationCard({
    required this.payment,
  });

  @override
  Widget build(BuildContext context) {
    final proof = payment.proof;

    final bool isVerified = proof?.isValid ?? false;

    return _WhiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Verification',
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            _verificationMessage(payment.status),
            style: GoogleFonts.poppins(
              color: AppColors.muted,
              fontSize: 12,
              height: 1.45,
            ),
          ),

          if (proof != null) ...[
            const SizedBox(height: 14),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isVerified
                    ? const Color(0xFFEAF5FF)
                    : AppColors.unknownBackground,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isVerified
                      ? const Color(0xFFC9E2FF)
                      : AppColors.border,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isVerified
                        ? Icons.verified_user_outlined
                        : Icons.info_outline,
                    color: isVerified
                        ? AppColors.primary
                        : AppColors.unknown,
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      isVerified
                          ? 'This transaction is secure and recorded on the ReliefChain ledger.'
                          : 'Ledger proof is currently unavailable for this transaction.',
                      style: GoogleFonts.poppins(
                        color: isVerified
                            ? AppColors.primary
                            : AppColors.unknown,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _verificationMessage(PaymentStatus status) {
    switch (status) {
      case PaymentStatus.pending:
        return 'Your payment is being processed.\n'
            'We will notify you once it is completed.';

      case PaymentStatus.settled:
        return 'Your payment has been successfully completed.';

      case PaymentStatus.failed:
        return 'This payment could not be completed.';

      case PaymentStatus.reversed:
        return 'This payment has been reversed.';

      case PaymentStatus.unknown:
        return 'The current payment status could not be confirmed.';
    }
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
        background = AppColors.pendingBackground;
        foreground = AppColors.pending;

      case PaymentStatus.settled:
        background = AppColors.successBackground;
        foreground = AppColors.success;

      case PaymentStatus.failed:
        background = AppColors.failedBackground;
        foreground = AppColors.failed;

      case PaymentStatus.reversed:
        background = AppColors.reversedBackground;
        foreground = AppColors.reversed;

      case PaymentStatus.unknown:
        background = AppColors.unknownBackground;
        foreground = AppColors.unknown;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
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

class _WhiteCard extends StatelessWidget {
  final Widget child;

  const _WhiteCard({
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        14,
        12,
        14,
        12,
      ),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: child,
    );
  }
}