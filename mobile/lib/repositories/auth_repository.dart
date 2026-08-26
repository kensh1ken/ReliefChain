import '../api/api_client.dart';
import '../api/api_routes.dart';
import '../models/auth_tokens.dart';

class AuthRepository {
  final ApiClient _apiClient;

  const AuthRepository(this._apiClient);

  Future<void> requestOtp(String phone) async {
    await _apiClient.postVoid(
      ApiRoutes.authOtpRequest,
      body: {
        'phone': phone,
      },
    );
  }

  Future<AuthTokens> verifyOtp({
    required String phone,
    required String otp,
  }) async {
    final json = await _apiClient.postMap(
      ApiRoutes.authOtpVerify,
      body: {
        'phone': phone,
        'otp': otp,
      },
    );

    return AuthTokens.fromJson(json);
  }

  Future<AuthTokens> refresh(String refreshToken) async {
    final json = await _apiClient.postMap(
      ApiRoutes.authRefresh,
      body: {
        'refreshToken': refreshToken,
      },
    );

    return AuthTokens.fromJson(json);
  }

  Future<void> logout() async {
    await _apiClient.postVoid(
      ApiRoutes.authLogout,
    );
  }
}