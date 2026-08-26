import 'package:flutter/material.dart';

import 'screens/splash/splash_screen.dart';

class ReliefChainApp extends StatelessWidget {
  const ReliefChainApp({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryBlue = Color(0xFF0759B8);
    const darkNavy = Color(0xFF0A1E44);
    const background = Color(0xFFEFF7FF);
    const surface = Colors.white;
    const mutedText = Color(0xFF66758A);

    return MaterialApp(
      title: 'ReliefChain',
      debugShowCheckedModeBanner: false,

      theme: ThemeData(
        useMaterial3: true,

        scaffoldBackgroundColor: background,

        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryBlue,
          brightness: Brightness.light,
        ).copyWith(
          primary: primaryBlue,
          onPrimary: Colors.white,
          surface: surface,
          onSurface: darkNavy,
          secondary: const Color(0xFF4D8DFF),
        ),

        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          foregroundColor: darkNavy,
          elevation: 0,
          centerTitle: true,
        ),

        textTheme: const TextTheme(
          headlineLarge: TextStyle(
            color: darkNavy,
            fontSize: 30,
            fontWeight: FontWeight.w700,
          ),
          headlineSmall: TextStyle(
            color: darkNavy,
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
          titleLarge: TextStyle(
            color: darkNavy,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
          titleMedium: TextStyle(
            color: darkNavy,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: TextStyle(
            color: darkNavy,
            fontSize: 16,
          ),
          bodyMedium: TextStyle(
            color: mutedText,
            fontSize: 14,
          ),
          bodySmall: TextStyle(
            color: mutedText,
            fontSize: 12,
          ),
        ),

        cardTheme: CardThemeData(
          color: surface,
          elevation: 2,
          shadowColor: Colors.black12,
          surfaceTintColor: Colors.transparent,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),

        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface,

          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),

          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
              color: Color(0xFFDCE7F3),
            ),
          ),

          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(
              color: primaryBlue,
              width: 1.5,
            ),
          ),

          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),

        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primaryBlue,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),

        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: primaryBlue,
            minimumSize: const Size.fromHeight(52),
            side: const BorderSide(
              color: Color(0xFFD1E1F3),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),

        chipTheme: ChipThemeData(
          backgroundColor: const Color(0xFFE7F1FF),
          side: BorderSide.none,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          labelStyle: const TextStyle(
            color: primaryBlue,
            fontWeight: FontWeight.w600,
          ),
        ),

        dividerTheme: const DividerThemeData(
          color: Color(0xFFE6EDF5),
          thickness: 1,
        ),
      ),

      home: const SplashScreen(),
    );
  }
}