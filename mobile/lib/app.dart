import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';

import 'providers/settings_provider.dart';
import 'screens/splash/splash_screen.dart';

class ReliefChainApp extends StatelessWidget {
  const ReliefChainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        return MaterialApp(
          title: 'ReliefChain',
          debugShowCheckedModeBanner: false,

          locale: Locale(settings.language),

          supportedLocales: const [
            Locale('en'),
            Locale('hi'),
          ],

          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],

          theme: ThemeData(
            useMaterial3: true,
            scaffoldBackgroundColor:
                AppColors.background,
            colorScheme: ColorScheme.fromSeed(
              seedColor: AppColors.primary,
              brightness: Brightness.light,
            ),
            textTheme: const TextTheme(
              headlineLarge: TextStyle(
                color: AppColors.navy,
                fontSize: 30,
                fontWeight: FontWeight.w700,
              ),
              headlineSmall: TextStyle(
                color: AppColors.navy,
                fontSize: 24,
                fontWeight: FontWeight.w700,
              ),
              titleLarge: TextStyle(
                color: AppColors.navy,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
              titleMedium: TextStyle(
                color: AppColors.navy,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              bodyLarge: TextStyle(
                color: AppColors.navy,
                fontSize: 16,
              ),
              bodyMedium: TextStyle(
                color: AppColors.muted,
                fontSize: 14,
              ),
              bodySmall: TextStyle(
                color: AppColors.muted,
                fontSize: 12,
              ),
            ),
          ),

          builder: (context, child) {
            final mediaQuery = MediaQuery.of(context);

            return MediaQuery(
              data: mediaQuery.copyWith(
                textScaler: TextScaler.linear(
                  settings.largeTextEnabled
                      ? 1.18
                      : 1.0,
                ),
              ),
              child: child ?? const SizedBox.shrink(),
            );
          },

          home: const SplashScreen(),
        );
      },
    );
  }
}