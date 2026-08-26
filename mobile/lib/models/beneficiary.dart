import 'package:json_annotation/json_annotation.dart';

import 'payment.dart';

part 'beneficiary.g.dart';

@JsonSerializable(explicitToJson: true)
class Beneficiary {
  final String name;
  final String districtCode;
  final String schemeName;
  final int promisedPaise;
  @JsonKey(defaultValue: <Payment>[])
  final List<Payment> payments;

  const Beneficiary({
    required this.name,
    required this.districtCode,
    required this.schemeName,
    required this.promisedPaise,
    required this.payments,
  });

  factory Beneficiary.fromJson(Map<String, dynamic> json) =>
      _$BeneficiaryFromJson(json);

  Map<String, dynamic> toJson() => _$BeneficiaryToJson(this);
}
