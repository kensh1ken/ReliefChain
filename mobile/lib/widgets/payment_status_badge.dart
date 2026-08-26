import 'package:flutter/material.dart';

import '../models/payment.dart';
import '../utils/formatters.dart';

class PaymentStatusBadge extends StatelessWidget {
  final PaymentStatus status;

  const PaymentStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final style = _statusStyle(context, status);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: style.foreground.withValues(alpha: 0.16)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(style.icon, size: 14, color: style.foreground),
            const SizedBox(width: 6),
            Text(
              paymentStatusLabel(status),
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: style.foreground,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

_StatusStyle _statusStyle(BuildContext context, PaymentStatus status) {
  final scheme = Theme.of(context).colorScheme;

  return switch (status) {
    PaymentStatus.pending => _StatusStyle(
      label: 'Pending',
      icon: Icons.schedule_outlined,
      foreground: const Color(0xff805600),
      background: const Color(0xfffff1cc),
    ),
    PaymentStatus.settled => _StatusStyle(
      label: 'Settled',
      icon: Icons.check_circle_outline,
      foreground: const Color(0xff116149),
      background: const Color(0xffdff7ed),
    ),
    PaymentStatus.failed => _StatusStyle(
      label: 'Failed',
      icon: Icons.error_outline,
      foreground: scheme.error,
      background: scheme.errorContainer,
    ),
    PaymentStatus.unknown => _StatusStyle(
      label: 'Unknown',
      icon: Icons.help_outline,
      foreground: const Color(0xff2f5b86),
      background: const Color(0xffdcecff),
    ),
    PaymentStatus.reversed => _StatusStyle(
      label: 'Reversed',
      icon: Icons.undo_outlined,
      foreground: const Color(0xff5a4888),
      background: const Color(0xffece6ff),
    ),
  };
}

class _StatusStyle {
  final String label;
  final IconData icon;
  final Color foreground;
  final Color background;

  const _StatusStyle({
    required this.label,
    required this.icon,
    required this.foreground,
    required this.background,
  });
}
