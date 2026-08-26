import 'package:json_annotation/json_annotation.dart';

part 'payment_proof.g.dart';

@JsonEnum()
enum LedgerProofStatus {
  @JsonValue('VALID')
  valid,

  @JsonValue('PENDING')
  pending,

  @JsonValue('UNKNOWN')
  unknown,
}

@JsonSerializable()
class PaymentProof {
  final String transactionId;
  final int? blockNumber;
  final DateTime committedAt;

  @JsonKey(unknownEnumValue: LedgerProofStatus.unknown)
  final LedgerProofStatus status;
  final String? ledgerMode;

  const PaymentProof({
    required this.transactionId,
    this.blockNumber,
    required this.committedAt,
    required this.status,
    this.ledgerMode,
  });

  factory PaymentProof.fromJson(Map<String, dynamic> json) =>
      _$PaymentProofFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentProofToJson(this);

  bool get isValid => status == LedgerProofStatus.valid;
}
