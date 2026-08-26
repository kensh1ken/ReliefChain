import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_tokens.dart';

class TokenStorage {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _expiresInKey = 'expires_in';

  final FlutterSecureStorage _storage;

  const TokenStorage({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
  }) : _storage = storage;

  Future<void> saveTokens(AuthTokens tokens) async {
    await Future.wait([
      _storage.write(
        key: _accessTokenKey,
        value: tokens.accessToken,
      ),

      if (tokens.refreshToken != null)
        _storage.write(
          key: _refreshTokenKey,
          value: tokens.refreshToken,
        )
      else
        _storage.delete(key: _refreshTokenKey),

      if (tokens.expiresIn != null)
        _storage.write(
          key: _expiresInKey,
          value: tokens.expiresIn.toString(),
        )
      else
        _storage.delete(key: _expiresInKey),
    ]);
  }

  Future<AuthTokens?> getTokens() async {
    final values = await Future.wait([
      _storage.read(key: _accessTokenKey),
      _storage.read(key: _refreshTokenKey),
      _storage.read(key: _expiresInKey),
    ]);

    final accessToken = values[0];
    final refreshToken = values[1];
    final expiresInString = values[2];

    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }

    return AuthTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: int.tryParse(expiresInString ?? ''),
    );
  }

  Future<String?> getAccessToken() {
    return _storage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() {
    return _storage.read(key: _refreshTokenKey);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _expiresInKey),
    ]);
  }
}