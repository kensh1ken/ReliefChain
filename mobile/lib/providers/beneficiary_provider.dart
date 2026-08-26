import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
import '../models/beneficiary.dart';
import '../repositories/beneficiary_repository.dart';

class BeneficiaryProvider extends ChangeNotifier {
  final BeneficiaryRepository _beneficiaryRepository;

  Beneficiary? _beneficiary;
  bool _isLoading = false;
  String? _errorMessage;

  BeneficiaryProvider(this._beneficiaryRepository);

  Beneficiary? get beneficiary => _beneficiary;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadMe() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _beneficiary = await _beneficiaryRepository.getMe();
    } on ApiException catch (error) {
      _errorMessage = error.message;
    } catch (_) {
      _errorMessage = 'Could not load beneficiary details.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clear() {
    _beneficiary = null;
    _errorMessage = null;
    _isLoading = false;
    notifyListeners();
  }
}
