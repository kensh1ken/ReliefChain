import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
import '../models/beneficiary.dart';
import '../repositories/beneficiary_repository.dart';

class BeneficiaryProvider extends ChangeNotifier {
  final BeneficiaryRepository _beneficiaryRepository;

  Beneficiary? _beneficiary;

  bool _isLoading = false;
  String? _errorMessage;

  BeneficiaryProvider(
    this._beneficiaryRepository,
  );

  Beneficiary? get beneficiary => _beneficiary;

  bool get isLoading => _isLoading;

  String? get errorMessage => _errorMessage;

  Future<bool> loadBeneficiary() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _beneficiary =
          await _beneficiaryRepository.getMe();

      return true;
    } on ApiException catch (error) {
      _errorMessage = error.message;
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

  Future<bool> refresh() {
    return loadBeneficiary();
  }

  void clear() {
    _beneficiary = null;
    _errorMessage = null;
    notifyListeners();
  }
}