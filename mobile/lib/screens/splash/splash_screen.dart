import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../home/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const Duration _minimumSplashDuration =
      Duration(seconds: 5);

  late final AnimationController _progressController;

  @override
  void initState() {
    super.initState();

    _progressController = AnimationController(
      vsync: this,
      duration: _minimumSplashDuration,
    )..forward();

    _startSplash();
  }

  Future<void> _startSplash() async {
    final authProvider = context.read<AuthProvider>();

    await Future.wait([
      authProvider.restoreSession(),
      Future.delayed(_minimumSplashDuration),
    ]);

    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const HomeScreen(),
        ),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(),
        ),
      );
    }
  }

  @override
  void dispose() {
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const navy = Color(0xFF0A1E44);
    const blue = Color(0xFF0759B8);

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Full-screen artwork.

          Image.asset(
            'assets/light_house.png',
            fit: BoxFit.cover,
            alignment: Alignment.center,
          ),

          // Very subtle light overlay at the top only.
          // No blur, no shadow, no text effects.

          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [
                      Colors.white.withOpacity(0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Branding.

          SafeArea(
            child: Align(
              alignment: const Alignment(0, -0.65),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 78,
                    height: 78,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(
                        color: blue,
                        width: 2,
                      ),
                    ),
                    child: const Icon(
                      Icons.water_drop,
                      size: 42,
                      color: blue,
                    ),
                  ),

                  const SizedBox(height: 18),

                  const Text(
                    'ReliefChain',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: navy,
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.7,
                      height: 1.1,
                    ),
                  ),

                  const SizedBox(height: 8),

                  const Text(
                    'Direct aid. Transparent impact.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.1,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // White loading bar.

          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(
                  left: 40,
                  right: 40,
                  bottom: 28,
                ),
                child: AnimatedBuilder(
                  animation: _progressController,
                  builder: (context, _) {
                    return ClipRRect(
                      borderRadius:
                          BorderRadius.circular(100),
                      child: Container(
                        height: 5,
                        color: Colors.white.withOpacity(0.35),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor:
                                _progressController.value,
                            child: Container(
                              decoration:
                                  const BoxDecoration(
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}