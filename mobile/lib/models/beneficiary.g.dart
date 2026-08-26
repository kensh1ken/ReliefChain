// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'beneficiary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Beneficiary _$BeneficiaryFromJson(Map<String, dynamic> json) => Beneficiary(
  name: json['name'] as String,
  districtCode: json['districtCode'] as String,
  schemeName: json['schemeName'] as String,
  promisedPaise: (json['promisedPaise'] as num).toInt(),
  payments:
      (json['payments'] as List<dynamic>?)
          ?.map((e) => Payment.fromJson(e as Map<String, dynamic>))
          .toList() ??
      [],
);

Map<String, dynamic> _$BeneficiaryToJson(Beneficiary instance) =>
    <String, dynamic>{
      'name': instance.name,
      'districtCode': instance.districtCode,
      'schemeName': instance.schemeName,
      'promisedPaise': instance.promisedPaise,
      'payments': instance.payments.map((e) => e.toJson()).toList(),
    };
