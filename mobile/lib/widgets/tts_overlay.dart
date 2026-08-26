import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/utils/colors.dart';

import '../providers/settings_provider.dart';
import '../services/tts_service.dart';

class TtsOverlay extends StatelessWidget {
  final String text;

  const TtsOverlay({
    super.key,
    required this.text,
  });

  Future<void> _speak(BuildContext context) async {
    final settings = context.read<SettingsProvider>();

    if (!settings.ttsEnabled) {
      return;
    }

    final tts = context.read<TtsService>();

    try {
      await tts.setLanguage(settings.language);
      await tts.speak(text);
    } catch (e) {
      debugPrint('TTS error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled =
        context.watch<SettingsProvider>().ttsEnabled;

    if (!enabled) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 0,
      right: 0,
      child: SizedBox(
        width: 40,
        height: 40,
        child: Material(
          color: Colors.transparent,
          child: IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(
              minWidth: 40,
              minHeight: 40,
            ),
            onPressed: () => _speak(context),
            tooltip: 'Read aloud',
            icon: const Icon(
              Icons.volume_up_outlined,
              color: AppColors.primary,
              size: 21,
            ),
          ),
        ),
      ),
    );
  }
}