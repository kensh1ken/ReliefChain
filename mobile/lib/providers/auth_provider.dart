import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../models/auth_tokens.dart';
import '../repositories/auth_repository.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  final ApiClient _apiClient;

  AuthTokens? _tokens;
  bool _isLoading = false;
  bool _otpRequested = false;
  String? _errorMessage;
  String? _phone;

  AuthProvider(this._authRepository, this._apiClient);

  AuthTokens? get tokens => _tokens;
  bool get isLoading => _isLoading;
  bool get otpRequested => _otpRequested;
  bool get isAuthenticated => _tokens?.accessToken.isNotEmpty ?? false;
  String? get errorMessage => _errorMessage;
  String? get phone => _phone;

  Future<bool> requestOtp(String phone) async {
    final normalizedPhone = phone.trim();
    if (!_isValidPhone(normalizedPhone)) {
      _setError('Enter a valid Indian phone number like +919876543210.');
      return false;
    }

    return _run(() async {
      await _authRepository.requestOtp(normalizedPhone);
      _phone = normalizedPhone;
      _otpRequested = true;
    });
  }

  Future<bool> verifyOtp(String otp) async {
    final currentPhone = _phone;
    final normalizedOtp = otp.trim();
    if (currentPhone == null) {
      _setError('Request an OTP first.');
      return false;
    }
    if (!_isValidOtp(normalizedOtp)) {
      _setError('Enter the 6 digit OTP.');
      return false;
    }

    return _run(() async {
      final tokens = await _authRepository.verifyOtp(
        phone: currentPhone,
        otp: normalizedOtp,
      );
      _setTokens(tokens);
    });
  }

  Future<bool> refreshIfPossible() async {
    final refreshToken = _tokens?.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;

    return _run(() async {
      final tokens = await _authRepository.refresh(refreshToken);
      _setTokens(tokens);
    });
  }

  Future<void> logout() async {
    final hadSession = isAuthenticated;
    try {
      if (hadSession) {
        await _authRepository.logout();
      }
    } on ApiException catch (error) {
      _errorMessage = error.message;
    } finally {
      _tokens = null;
      _apiClient.setAccessToken(null);
      _otpRequested = false;
      notifyListeners();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<bool> _run(Future<void> Function() action) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await action();
      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;
      return false;
    } catch (_) {
      _errorMessage = 'Something went wrong. Please try again.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _setTokens(AuthTokens tokens) {
    _tokens = tokens;
    _apiClient.setAccessToken(tokens.accessToken);
  }

  void _setError(String message) {
    _errorMessage = message;
    notifyListeners();
  }

  bool _isValidPhone(String phone) => RegExp(r'^\+91\d{10}$').hasMatch(phone);

  bool _isValidOtp(String otp) => RegExp(r'^\d{6}$').hasMatch(otp);
}
