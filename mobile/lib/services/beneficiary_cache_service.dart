import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

import '../models/beneficiary.dart';

class BeneficiaryCacheService {
  static const String _boxName = 'beneficiary_cache';
  static const String _beneficiaryKey = 'beneficiary';

  Box<String> get _box =>
      Hive.box<String>(_boxName);

  Future<void> init() async {
    await Hive.initFlutter();

    if (!Hive.isBoxOpen(_boxName)) {
      await Hive.openBox<String>(_boxName);
    }
  }

  Future<void> save(
    Beneficiary beneficiary,
  ) async {
    final jsonString = jsonEncode(
      beneficiary.toJson(),
    );

    await _box.put(
      _beneficiaryKey,
      jsonString,
    );
  }

  Beneficiary? load() {
    final jsonString =
        _box.get(_beneficiaryKey);

    if (jsonString == null) {
      return null;
    }

    try {
      final decoded = jsonDecode(jsonString);

      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      return Beneficiary.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() async {
    await _box.delete(_beneficiaryKey);
  }
}