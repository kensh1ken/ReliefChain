import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'app.dart';
import 'providers/auth_provider.dart';
import 'providers/beneficiary_provider.dart';
import 'repositories/auth_repository.dart';
import 'repositories/beneficiary_repository.dart';
import 'storage/token_storage.dart';

void main() {
  runApp(const AppBootstrap());
}

class AppBootstrap extends StatelessWidget {
  const AppBootstrap({super.key});

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
          create: (context) => BeneficiaryRepository(
            context.read<ApiClient>(),
          ),
        ),

        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            context.read<AuthRepository>(),
            context.read<ApiClient>(),
            context.read<TokenStorage>(),
          ),
        ),

        ChangeNotifierProvider<BeneficiaryProvider>(
          create: (context) => BeneficiaryProvider(
            context.read<BeneficiaryRepository>(),
          ),
        ),
      ],

      child: const ReliefChainApp(),
    );
  }
}