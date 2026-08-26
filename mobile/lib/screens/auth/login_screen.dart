import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final authProvider = context.read<AuthProvider>();

    final success = await authProvider.requestOtp(
      _phoneController.text,
    );

    if (!mounted) return;

    if (success) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const OtpScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ReliefChain'),
      ),

      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Consumer<AuthProvider>(
            builder: (context, auth, _) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 48),

                  const Text(
                    'Welcome',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 12),

                  const Text(
                    'Enter your registered phone number '
                    'to continue.',
                  ),

                  const SizedBox(height: 32),

                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    enabled: !auth.isLoading,
                    decoration: const InputDecoration(
                      labelText: 'Phone number',
                      hintText: '+919876543210',
                    ),
                  ),

                  const SizedBox(height: 16),

                  if (auth.errorMessage != null)
                    Text(
                      auth.errorMessage!,
                      style: TextStyle(
                        color: Theme.of(context)
                            .colorScheme
                            .error,
                      ),
                    ),

                  const Spacer(),

                  FilledButton(
                    onPressed: auth.isLoading
                        ? null
                        : _requestOtp,
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('Send OTP'),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}