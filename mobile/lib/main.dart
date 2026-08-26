import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'providers/auth_provider.dart';
import 'providers/beneficiary_provider.dart';
import 'repositories/auth_repository.dart';
import 'repositories/beneficiary_repository.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>(
          create: (_) => ApiClient(),
          dispose: (_, client) => client.close(),
        ),
        Provider<AuthRepository>(
          create: (context) => AuthRepository(context.read<ApiClient>()),
        ),
        Provider<BeneficiaryRepository>(
          create: (context) => BeneficiaryRepository(context.read<ApiClient>()),
        ),
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            context.read<AuthRepository>(),
            context.read<ApiClient>(),
          ),
        ),
        ChangeNotifierProvider<BeneficiaryProvider>(
          create: (context) =>
              BeneficiaryProvider(context.read<BeneficiaryRepository>()),
        ),
      ],
      child: MaterialApp(
        title: 'ReliefChain',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff0f766e),
          ),
          inputDecorationTheme: const InputDecorationTheme(
            border: OutlineInputBorder(),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          cardTheme: CardThemeData(
            margin: EdgeInsets.zero,
            color: Colors.white,
            surfaceTintColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        home: const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      ),
    );
  }
}

