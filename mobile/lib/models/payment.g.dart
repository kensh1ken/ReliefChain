// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Payment _$PaymentFromJson(Map<String, dynamic> json) => Payment(
  publicReference: json['public_reference'] as String,
  amountPaise: (json['amount_paise'] as num).toInt(),
  status: $enumDecode(
    _$PaymentStatusEnumMap,
    json['status'],
    unknownValue: PaymentStatus.unknown,
  ),
  bankReference: json['bank_reference'] as String?,
  proof: json['proof'] == null
      ? null
      : PaymentProof.fromJson(json['proof'] as Map<String, dynamic>),
  createdAt: DateTime.parse(json['created_at'] as String),
  updatedAt: DateTime.parse(json['updated_at'] as String),
);

Map<String, dynamic> _$PaymentToJson(Payment instance) => <String, dynamic>{
  'public_reference': instance.publicReference,
  'amount_paise': instance.amountPaise,
  'status': _$PaymentStatusEnumMap[instance.status]!,
  'bank_reference': instance.bankReference,
  'proof': instance.proof?.toJson(),
  'created_at': instance.createdAt.toIso8601String(),
  'updated_at': instance.updatedAt.toIso8601String(),
};

const _$PaymentStatusEnumMap = {
  PaymentStatus.pending: 'PENDING',
  PaymentStatus.settled: 'SETTLED',
  PaymentStatus.failed: 'FAILED',
  PaymentStatus.unknown: 'UNKNOWN',
  PaymentStatus.reversed: 'REVERSED',
};
