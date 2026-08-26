import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
import '../models/beneficiary.dart';
import '../repositories/beneficiary_repository.dart';
import '../services/beneficiary_cache_service.dart';

class BeneficiaryProvider extends ChangeNotifier {
  final BeneficiaryRepository _beneficiaryRepository;
  final BeneficiaryCacheService _cacheService;

  Beneficiary? _beneficiary;
  bool _isLoading = false;
  String? _errorMessage;

  BeneficiaryProvider(
    this._beneficiaryRepository,
    this._cacheService,
  );

  Beneficiary? get beneficiary => _beneficiary;

  bool get isLoading => _isLoading;

  String? get errorMessage => _errorMessage;

  Future<bool> loadBeneficiary() async {
    _errorMessage = null;

    // Load cached data first.
    try {
      final cachedBeneficiary =
          await _cacheService.load();

      if (cachedBeneficiary != null) {
        _beneficiary = cachedBeneficiary;
        notifyListeners();
      }
    } catch (_) {
      // Cache failure should never prevent
      // the app from trying the API.
    }

    // Fetch fresh data from the API.
    _isLoading = true;
    notifyListeners();

    try {
      final freshBeneficiary =
          await _beneficiaryRepository.getMe();

      _beneficiary = freshBeneficiary;

      // Save the fresh response.
      try {
        await _cacheService.save(
          freshBeneficiary,
        );
      } catch (_) {
        // Cache failure should not make
        // a successful API request fail.
      }

      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;

      // If cached data exists, keep showing it.
      // Only show the error if we have nothing.
      if (_beneficiary != null) {
        _errorMessage = null;
      }

      return false;
    } catch (_) {
      if (_beneficiary == null) {
        _errorMessage =
            'Something went wrong. Please try again.';
      }

      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> refresh() async {
    _errorMessage = null;
    _isLoading = true;
    notifyListeners();

    try {
      final freshBeneficiary =
          await _beneficiaryRepository.getMe();

      _beneficiary = freshBeneficiary;

      try {
        await _cacheService.save(
          freshBeneficiary,
        );
      } catch (_) {
        // Do not fail refresh just because
        // cache writing failed.
      }

      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;

      // Keep whatever data is already visible.
      return false;
    } catch (_) {
      _errorMessage =
          'Something went wrong. Please try again.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> clear() async {
    _beneficiary = null;
    _errorMessage = null;

    await _cacheService.clear();

    notifyListeners();
  }
}