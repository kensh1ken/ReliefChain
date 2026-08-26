import '../models/payment.dart';
import '../models/payment_proof.dart';

String formatPaise(int paise) {
  return 'INR ${(paise / 100).toStringAsFixed(2)}';
}

String formatDateTime(DateTime value) {
  final local = value.toLocal();
  return '${_four(local.year)}-${_two(local.month)}-${_two(local.day)} '
      '${_two(local.hour)}:${_two(local.minute)}';
}

String paymentStatusLabel(PaymentStatus status) {
  return switch (status) {
    PaymentStatus.pending => 'Pending',
    PaymentStatus.settled => 'Settled',
    PaymentStatus.failed => 'Failed',
    PaymentStatus.unknown => 'Unknown',
    PaymentStatus.reversed => 'Reversed',
  };
}

String ledgerProofStatusLabel(LedgerProofStatus status) {
  return switch (status) {
    LedgerProofStatus.valid => 'Valid',
    LedgerProofStatus.pending => 'Pending',
    LedgerProofStatus.unknown => 'Unknown',
  };
}

String _two(int value) => value.toString().padLeft(2, '0');

String _four(int value) => value.toString().padLeft(4, '0');
