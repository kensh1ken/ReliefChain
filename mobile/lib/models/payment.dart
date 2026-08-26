import 'package:json_annotation/json_annotation.dart';

import 'payment_proof.dart';

part 'payment.g.dart';

@JsonEnum()
enum PaymentStatus {
  @JsonValue('PENDING')
  pending,

  @JsonValue('SETTLED')
  settled,

  @JsonValue('FAILED')
  failed,

  @JsonValue('UNKNOWN')
  unknown,

  @JsonValue('REVERSED')
  reversed,
}

@JsonSerializable(explicitToJson: true)
class Payment {
  @JsonKey(name: 'public_reference')
  final String publicReference;

  @JsonKey(name: 'amount_paise')
  final int amountPaise;

  @JsonKey(unknownEnumValue: PaymentStatus.unknown)
  final PaymentStatus status;

  @JsonKey(name: 'bank_reference')
  final String? bankReference;

  final PaymentProof? proof;

  @JsonKey(name: 'created_at')
  final DateTime createdAt;

  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const Payment({
    required this.publicReference,
    required this.amountPaise,
    required this.status,
    this.bankReference,
    this.proof,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) =>
      _$PaymentFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentToJson(this);

  double get amount => amountPaise / 100;
}
