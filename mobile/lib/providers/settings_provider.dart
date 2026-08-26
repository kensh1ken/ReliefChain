import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider extends ChangeNotifier {
  static const _ttsKey = 'tts_enabled';
  static const _largeTextKey = 'large_text_enabled';
  static const _languageKey = 'language';

  bool _ttsEnabled = true;
  bool _largeTextEnabled = false;
  String _language = 'en';

  bool get ttsEnabled => _ttsEnabled;
  bool get largeTextEnabled => _largeTextEnabled;
  String get language => _language;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();

    _ttsEnabled = prefs.getBool(_ttsKey) ?? true;
    _largeTextEnabled = prefs.getBool(_largeTextKey) ?? false;
    _language = prefs.getString(_languageKey) ?? 'en';

    notifyListeners();
  }

  Future<void> setTtsEnabled(bool value) async {
    _ttsEnabled = value;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_ttsKey, value);

    notifyListeners();
  }

  Future<void> setLargeTextEnabled(bool value) async {
    _largeTextEnabled = value;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_largeTextKey, value);

    notifyListeners();
  }

  Future<void> setLanguage(String language) async {
    _language = language;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_languageKey, language);

    notifyListeners();
  }
}