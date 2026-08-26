import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../providers/auth_provider.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();

  static const Color background = Color(0xFFEAF5FF);
  static const Color navy = Color(0xFF0A1E44);
  static const Color blue = Color(0xFF0759B8);
  static const Color muted = Color(0xFF65758A);
  static const Color border = Color(0xFFD6E3EF);

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = _phoneController.text.trim();

    if (phone.length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid 10-digit mobile number.')),
      );
      return;
    }

    final success = await context.read<AuthProvider>().requestOtp('+91$phone');

    if (!mounted) return;

    if (success) {
      Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => const OtpScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      resizeToAvoidBottomInset: false,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // BACKGROUND
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFEAF5FF),
                  Color(0xFFF4FAFF),
                  Color(0xFFE7F3FD),
                ],
                stops: [0.0, 0.62, 1.0],
              ),
            ),
          ),

          // Very subtle cloud shapes.
          Positioned(
            top: 72,
            right: -35,
            child: Container(
              width: 170,
              height: 72,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.25),
                borderRadius: BorderRadius.circular(60),
              ),
            ),
          ),

          Positioned(
            top: 118,
            right: 40,
            child: Container(
              width: 90,
              height: 45,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.22),
                borderRadius: BorderRadius.circular(40),
              ),
            ),
          ),

          // SMALL LIGHTHOUSE DECORATION
          Positioned(
            right: -60,
            bottom: -12,
            child: Opacity(
              opacity: 0.34,
              child: SizedBox(
                width: 500,
                height: 1000,
                child: ClipRect(
                  child: Image.asset(
                    'assets/light_house.png',
                    fit: BoxFit.cover,
                    alignment: const Alignment(0.70, 0.85),
                  ),
                ),
              ),
            ),
          ),

          // CONTENT
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Spacer(),
                      TtsButton(
                        text:
                            'Welcome to ReliefChain. '
                            'Let’s get started. '
                            'Enter your mobile number. '
                            'We’ll send you a 6-digit OTP.',
                      ),
                    ],
                  ),
                  // Heading.
                  const Text(
                    'Welcome',
                    style: TextStyle(
                      color: navy,
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.7,
                      height: 1.1,
                    ),
                  ),

                  const SizedBox(height: 5),

                  const Text(
                    "Let's get started",
                    style: TextStyle(
                      color: navy,
                      fontSize: 17,
                      fontWeight: FontWeight.w400,
                      height: 1.2,
                    ),
                  ),

                  const SizedBox(height: 44),

                  // Input heading.
                  const Text(
                    'Enter your mobile number',
                    style: TextStyle(
                      color: navy,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: 6),

                  const Text(
                    'We’ll send you a 6-digit OTP',
                    style: TextStyle(color: muted, fontSize: 14, height: 1.25),
                  ),

                  const SizedBox(height: 24),

                  // Phone + button.
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // PHONE FIELD
                          Container(
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: border, width: 1),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(width: 15),

                                const Text(
                                  '+91',
                                  style: TextStyle(
                                    color: navy,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),

                                const SizedBox(width: 13),

                                Container(width: 1, height: 24, color: border),

                                Expanded(
                                  child: TextField(
                                    controller: _phoneController,
                                    enabled: !auth.isLoading,
                                    keyboardType: TextInputType.phone,
                                    maxLength: 10,
                                    decoration: const InputDecoration(
                                      hintText: 'Mobile number',
                                      hintStyle: TextStyle(
                                        color: Color(0xFF9AA7B6),
                                        fontSize: 15,
                                      ),
                                      border: InputBorder.none,
                                      counterText: '',
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 14,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // ERROR
                          if (auth.errorMessage != null) ...[
                            const SizedBox(height: 10),
                            Text(
                              auth.errorMessage!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                                fontSize: 13,
                              ),
                            ),
                          ],

                          const SizedBox(height: 18),

                          // CONTINUE BUTTON
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: FilledButton(
                              onPressed: auth.isLoading ? null : _requestOtp,
                              style: FilledButton.styleFrom(
                                backgroundColor: blue,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: auth.isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text(
                                      'Continue',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),

                  const Spacer(),

                  // TERMS
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.only(bottom: 2),
                      child: Text.rich(
                        TextSpan(
                          text: 'By continuing, you agree to our\n',
                          style: TextStyle(
                            color: muted,
                            fontSize: 12,
                            height: 1.5,
                          ),
                          children: [
                            TextSpan(
                              text: 'Terms of Service & Privacy Policy',
                              style: TextStyle(
                                color: blue,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
