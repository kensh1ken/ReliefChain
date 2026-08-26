// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_proof.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PaymentProof _$PaymentProofFromJson(Map<String, dynamic> json) => PaymentProof(
  transactionId: json['transactionId'] as String,
  blockNumber: (json['blockNumber'] as num?)?.toInt(),
  committedAt: DateTime.parse(json['committedAt'] as String),
  status: $enumDecode(
    _$LedgerProofStatusEnumMap,
    json['status'],
    unknownValue: LedgerProofStatus.unknown,
  ),
  ledgerMode: json['ledgerMode'] as String?,
);

Map<String, dynamic> _$PaymentProofToJson(PaymentProof instance) =>
    <String, dynamic>{
      'transactionId': instance.transactionId,
      'blockNumber': instance.blockNumber,
      'committedAt': instance.committedAt.toIso8601String(),
      'status': _$LedgerProofStatusEnumMap[instance.status]!,
      'ledgerMode': instance.ledgerMode,
    };

const _$LedgerProofStatusEnumMap = {
  LedgerProofStatus.valid: 'VALID',
  LedgerProofStatus.pending: 'PENDING',
  LedgerProofStatus.unknown: 'UNKNOWN',
};
