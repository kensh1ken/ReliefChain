import 'package:json_annotation/json_annotation.dart';

part 'auth_tokens.g.dart';

@JsonSerializable()
class AuthTokens {
  final String accessToken;
  final String? refreshToken;
  final int? expiresIn;

  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.expiresIn,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) =>
      _$AuthTokensFromJson(json);

  Map<String, dynamic> toJson() => _$AuthTokensToJson(this);

  bool get canRefresh => refreshToken?.isNotEmpty ?? false;
}
