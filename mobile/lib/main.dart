import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:reliefchain/providers/settings_provider.dart';
import 'package:reliefchain/services/beneficiary_cache_service.dart';
import 'package:reliefchain/services/tts_service.dart';

import 'api/api_client.dart';
import 'app.dart';
import 'providers/auth_provider.dart';
import 'providers/beneficiary_provider.dart';
import 'repositories/auth_repository.dart';
import 'repositories/beneficiary_repository.dart';
import 'storage/token_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final cacheService = BeneficiaryCacheService();

  await cacheService.init();

  runApp(
    AppBootstrap(
      cacheService: cacheService,
    ),
  );
}

class AppBootstrap extends StatelessWidget {
  final BeneficiaryCacheService cacheService;

  const AppBootstrap({
    super.key,
    required this.cacheService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>(
          create: (_) => ApiClient(),
          dispose: (_, client) => client.close(),
        ),

        Provider<TokenStorage>(
          create: (_) => const TokenStorage(),
        ),

        Provider<AuthRepository>(
          create: (context) => AuthRepository(
            context.read<ApiClient>(),
          ),
        ),

        Provider<BeneficiaryRepository>(
          create: (context) =>
              BeneficiaryRepository(
            context.read<ApiClient>(),
          ),
        ),

        Provider<BeneficiaryCacheService>.value(
          value: cacheService,
        ),

        Provider<TtsService>(
          create: (_) => TtsService(),
        ),

        ChangeNotifierProvider<SettingsProvider>(
          create: (_) => SettingsProvider()..load(),
        ),

        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            context.read<AuthRepository>(),
            context.read<ApiClient>(),
            context.read<TokenStorage>(),
          ),
        ),

        ChangeNotifierProvider<BeneficiaryProvider>(
          create: (context) =>
              BeneficiaryProvider(
            context.read<BeneficiaryRepository>(),
            context.read<BeneficiaryCacheService>(),
          ),
        ),
      ],
      child: const ReliefChainApp(),
    );
  }
}