import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:reliefchain/screens/language/language_select_screen.dart';

import '../../providers/auth_provider.dart';
import '../../widgets/tts_button.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  static const Color background = Color(0xFFEAF5FF);
  static const Color navy = Color(0xFF0A1E44);
  static const Color blue = Color(0xFF0759B8);
  static const Color muted = Color(0xFF65758A);
  static const Color border = Color(0xFFD6E3EF);

  static const int _otpLength = 6;
  static const int _otpDuration = 300;

  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;

  Timer? _timer;
  int _remainingSeconds = _otpDuration;

  @override
  void initState() {
    super.initState();

    _controllers = List.generate(
      _otpLength,
      (_) => TextEditingController(),
    );

    _focusNodes = List.generate(
      _otpLength,
      (_) => FocusNode(),
    );

    _startTimer();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNodes.first.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();

    for (final controller in _controllers) {
      controller.dispose();
    }

    for (final node in _focusNodes) {
      node.dispose();
    }

    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();

    setState(() {
      _remainingSeconds = _otpDuration;
    });

    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }

        if (_remainingSeconds <= 1) {
          timer.cancel();

          setState(() {
            _remainingSeconds = 0;
          });

          return;
        }

        setState(() {
          _remainingSeconds--;
        });
      },
    );
  }

  String get _formattedTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;

    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  String _maskedPhone(String? phone) {
    if (phone == null || phone.length < 5) {
      return '+91 ••••••••10';
    }

    final normalized = phone.replaceAll(
      RegExp(r'\s+'),
      '',
    );

    if (normalized.length < 6) {
      return normalized;
    }

    final lastTwo = normalized.substring(
      normalized.length - 2,
    );

    return '+91 ••••••••$lastTwo';
  }

  String get _otp {
    return _controllers
        .map((controller) => controller.text)
        .join();
  }

  Future<void> _verifyOtp() async {
    if (_otp.length != _otpLength) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter the complete 6-digit OTP.'),
        ),
      );

      return;
    }

    final success = await context
        .read<AuthProvider>()
        .verifyOtp(_otp);

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => const LanguageSelectScreen(),
        ),
        (route) => false,
      );
    }
  }

  Future<void> _resendOtp() async {
    if (_remainingSeconds > 0) {
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final phone = authProvider.phone;

    if (phone == null || phone.isEmpty) {
      return;
    }

    final success = await authProvider.requestOtp(phone);

    if (!mounted) return;

    if (success) {
      for (final controller in _controllers) {
        controller.clear();
      }

      _startTimer();
      _focusNodes.first.requestFocus();
    }
  }

  void _handleDigitChanged(
    int index,
    String value,
  ) {
    if (value.length > 1) {
      final digits = value.replaceAll(
        RegExp(r'\D'),
        '',
      );

      for (
        int i = 0;
        i < digits.length && index + i < _otpLength;
        i++
      ) {
        _controllers[index + i].text = digits[i];
      }

      final nextIndex = (index + digits.length)
          .clamp(0, _otpLength - 1);

      _focusNodes[nextIndex].requestFocus();

      if (_otp.length == _otpLength) {
        _verifyOtp();
      }

      return;
    }

    if (value.isNotEmpty && index < _otpLength - 1) {
      _focusNodes[index + 1].requestFocus();
    }

    if (_otp.length == _otpLength) {
      _verifyOtp();
    }
  }

  KeyEventResult _handleKeyEvent(
    int index,
    KeyEvent event,
  ) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.backspace &&
        _controllers[index].text.isEmpty &&
        index > 0) {
      _controllers[index - 1].clear();
      _focusNodes[index - 1].requestFocus();

      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      resizeToAvoidBottomInset: false,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Clean background.

          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFEAF5FF),
                  Color(0xFFF4FAFF),
                ],
              ),
            ),
          ),

          // Very subtle lighthouse decoration.

          Positioned.fill(
            right: -60,
            bottom: -12,
            child: IgnorePointer(
              child: Opacity(
                opacity: 0.34,
                child: SizedBox(
                  width: 500,
                  height: 1000,
                  child: ClipRect(
                    child: Image.asset(
                      'assets/light_house.png',
                      fit: BoxFit.cover,
                      alignment: const Alignment(
                        0.70,
                        0.85,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                20,
                12,
                20,
                24,
              ),
              child: Consumer<AuthProvider>(
                builder: (context, auth, _) {
                  return Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      // Top controls.

                      Row(
                        children: [
                          IconButton(
                            onPressed: auth.isLoading
                                ? null
                                : () {
                                    Navigator.of(context)
                                        .maybePop();
                                  },
                            padding: EdgeInsets.zero,
                            constraints:
                                const BoxConstraints(
                              minWidth: 40,
                              minHeight: 40,
                            ),
                            icon: const Icon(
                              Icons
                                  .arrow_back_ios_new_rounded,
                              size: 20,
                              color: navy,
                            ),
                          ),

                          const Spacer(),

                          const TtsButton(
                            text:
                                'Enter OTP. '
                                'We have sent a 6-digit code '
                                'to your mobile number. '
                                'Enter the code to continue. '
                                'The OTP expires in five minutes.',
                          ),
                        ],
                      ),

                      const SizedBox(height: 28),

                      // Heading.

                      const Text(
                        'Enter OTP',
                        style: TextStyle(
                          color: navy,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.6,
                        ),
                      ),

                      const SizedBox(height: 6),

                      const Text(
                        "We've sent a 6-digit code to",
                        style: TextStyle(
                          color: muted,
                          fontSize: 14,
                        ),
                      ),

                      const SizedBox(height: 5),

                      Text(
                        _maskedPhone(auth.phone),
                        style: const TextStyle(
                          color: navy,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),

                      const SizedBox(height: 28),

                      // OTP fields.

                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: List.generate(
                          _otpLength,
                          (index) {
                            return SizedBox(
                              width: 48,
                              height: 52,
                              child: Focus(
                                onKeyEvent: (
                                  node,
                                  event,
                                ) {
                                  return _handleKeyEvent(
                                    index,
                                    event,
                                  );
                                },
                                child: TextField(
                                  controller:
                                      _controllers[index],
                                  focusNode:
                                      _focusNodes[index],
                                  enabled:
                                      !auth.isLoading,
                                  autofocus:
                                      index == 0,
                                  keyboardType:
                                      TextInputType.number,
                                  textInputAction:
                                      index ==
                                              _otpLength - 1
                                          ? TextInputAction.done
                                          : TextInputAction.next,
                                  textAlign:
                                      TextAlign.center,
                                  maxLength: 1,
                                  obscureText: false,
                                  inputFormatters: [
                                    FilteringTextInputFormatter
                                        .digitsOnly,
                                  ],
                                  style: const TextStyle(
                                    color: navy,
                                    fontSize: 20,
                                    fontWeight:
                                        FontWeight.w600,
                                  ),
                                  decoration:
                                      InputDecoration(
                                    counterText: '',
                                    filled: true,
                                    fillColor: Colors.white,
                                    contentPadding:
                                        EdgeInsets.zero,
                                    border:
                                        OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius
                                              .circular(10),
                                      borderSide:
                                          const BorderSide(
                                        color: border,
                                      ),
                                    ),
                                    enabledBorder:
                                        OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius
                                              .circular(10),
                                      borderSide:
                                          const BorderSide(
                                        color: border,
                                      ),
                                    ),
                                    focusedBorder:
                                        OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius
                                              .circular(10),
                                      borderSide:
                                          const BorderSide(
                                        color: blue,
                                        width: 1.5,
                                      ),
                                    ),
                                  ),
                                  onChanged: (value) {
                                    _handleDigitChanged(
                                      index,
                                      value,
                                    );
                                  },
                                  onSubmitted: (_) {
                                    if (_otp.length ==
                                        _otpLength) {
                                      _verifyOtp();
                                    }
                                  },
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Timer.

                      Center(
                        child: RichText(
                          text: TextSpan(
                            style: const TextStyle(
                              color: muted,
                              fontSize: 13,
                            ),
                            children: [
                              const TextSpan(
                                text: 'OTP expires in ',
                              ),
                              TextSpan(
                                text: _formattedTime,
                                style: const TextStyle(
                                  color: blue,
                                  fontWeight:
                                      FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Resend.

                      Center(
                        child: TextButton(
                          onPressed:
                              _remainingSeconds == 0 &&
                                      !auth.isLoading
                                  ? _resendOtp
                                  : null,
                          child: Text(
                            'Resend OTP',
                            style: TextStyle(
                              color:
                                  _remainingSeconds == 0
                                      ? blue
                                      : muted.withOpacity(
                                          0.55,
                                        ),
                              fontWeight:
                                  FontWeight.w600,
                            ),
                          ),
                        ),
                      ),

                      if (auth.errorMessage != null) ...[
                        const SizedBox(height: 8),
                        Center(
                          child: Text(
                            auth.errorMessage!,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .error,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 18),

                      // Verify button.

                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: FilledButton(
                          onPressed: auth.isLoading
                              ? null
                              : _verifyOtp,
                          style: FilledButton.styleFrom(
                            backgroundColor: blue,
                            foregroundColor: Colors.white,
                            shape:
                                RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(12),
                            ),
                          ),
                          child: auth.isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child:
                                      CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Verify OTP',
                                  style: TextStyle(
                                    fontWeight:
                                        FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}