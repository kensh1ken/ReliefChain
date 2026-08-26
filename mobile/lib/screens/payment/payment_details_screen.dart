import 'package:flutter/material.dart';

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
    final proof = payment.proof;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Details'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _StatusCard(
            status: payment.status,
          ),

          const SizedBox(height: 16),

          _SectionCard(
            title: 'Payment Information',
            children: [
              _DetailRow(
                label: 'Amount',
                value: formatPaise(payment.amountPaise),
              ),
              _DetailRow(
                label: 'Status',
                value: paymentStatusLabel(payment.status),
              ),
              _DetailRow(
                label: 'Public Reference',
                value: payment.publicReference,
              ),
              _DetailRow(
                label: 'Created',
                value: formatDateTime(payment.createdAt),
              ),
              _DetailRow(
                label: 'Updated',
                value: formatDateTime(payment.updatedAt),
              ),
              if (payment.bankReference != null &&
                  payment.bankReference!.isNotEmpty)
                _DetailRow(
                  label: 'Bank Reference',
                  value: payment.bankReference!,
                ),
            ],
          ),

          if (proof != null) ...[
            const SizedBox(height: 16),

            _SectionCard(
              title: 'Ledger Proof',
              children: [
                _DetailRow(
                  label: 'Status',
                  value: ledgerProofStatusLabel(
                    proof.status,
                  ),
                ),
                _DetailRow(
                  label: 'Transaction ID',
                  value: proof.transactionId,
                ),
                if (proof.blockNumber != null)
                  _DetailRow(
                    label: 'Block Number',
                    value: proof.blockNumber.toString(),
                  ),
                _DetailRow(
                  label: 'Committed At',
                  value: formatDateTime(
                    proof.committedAt,
                  ),
                ),
                if (proof.ledgerMode != null &&
                    proof.ledgerMode!.isNotEmpty)
                  _DetailRow(
                    label: 'Ledger Mode',
                    value: proof.ledgerMode!,
                  ),
              ],
            ),

            const SizedBox(height: 16),

            _ProofStatusBanner(
              isValid: proof.isValid,
            ),
          ] else ...[
            const SizedBox(height: 16),

            const _ProofStatusBanner(
              isValid: false,
              message: 'No ledger proof is available for this payment.',
            ),
          ],
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final PaymentStatus status;

  const _StatusCard({
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final isSettled = status == PaymentStatus.settled;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              isSettled
                  ? Icons.check_circle_outline
                  : Icons.info_outline,
              size: 52,
            ),
            const SizedBox(height: 12),
            Text(
              paymentStatusLabel(status),
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              _statusDescription(status),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  String _statusDescription(PaymentStatus status) {
    return switch (status) {
      PaymentStatus.pending =>
        'Your payment is currently being processed.',
      PaymentStatus.settled =>
        'Your payment has been successfully completed.',
      PaymentStatus.failed =>
        'This payment could not be completed.',
      PaymentStatus.reversed =>
        'This payment has been reversed.',
      PaymentStatus.unknown =>
        'The current payment status could not be confirmed.',
    };
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
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
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelMedium,
          ),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProofStatusBanner extends StatelessWidget {
  final bool isValid;
  final String? message;

  const _ProofStatusBanner({
    required this.isValid,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isValid
                  ? Icons.verified_outlined
                  : Icons.info_outline,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message ??
                    'Ledger proof has been verified successfully.',
                style: const TextStyle(
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