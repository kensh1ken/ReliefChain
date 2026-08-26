import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:reliefchain/utils/colors.dart';

import '../home/home_screen.dart';

class LanguageSelectScreen extends StatefulWidget {
  final bool fromSettings;

  const LanguageSelectScreen({
    super.key,
    this.fromSettings = false,
  });

  @override
  State<LanguageSelectScreen> createState() =>
      _LanguageSelectScreenState();
}

class _LanguageSelectScreenState
    extends State<LanguageSelectScreen> {
  String _selectedLanguage = 'English';

  void _continue() {
    if (widget.fromSettings) {
      Navigator.of(context).pop();
      return;
    }

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const HomeScreen(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.background,
                  AppColors.backgroundLight,
                ],
              ),
            ),
          ),

          Positioned(
            right: -60,
            bottom: -30,
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
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                20,
                10,
                20,
                24,
              ),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  if (widget.fromSettings)
                    IconButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 40,
                        minHeight: 40,
                      ),
                      icon: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: AppColors.navy,
                        size: 20,
                      ),
                    )
                  else
                    const SizedBox(height: 40),

                  const SizedBox(height: 24),

                  Text(
                    'Choose your preferred language',
                    style: GoogleFonts.poppins(
                      color: AppColors.navy,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: 18),

                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        _LanguageOption(
                          title: 'English',
                          subtitle: 'English',
                          selected:
                              _selectedLanguage == 'English',
                          onTap: () {
                            setState(() {
                              _selectedLanguage = 'English';
                            });
                          },
                        ),
                        const Padding(
                          padding: EdgeInsets.only(left: 16),
                          child: Divider(
                            height: 1,
                            color: AppColors.divider,
                          ),
                        ),
                        _LanguageOption(
                          title: 'Hindi',
                          subtitle: 'हिंदी',
                          selected:
                              _selectedLanguage == 'Hindi',
                          onTap: () {
                            setState(() {
                              _selectedLanguage = 'Hindi';
                            });
                          },
                        ),
                      ],
                    ),
                  ),

                  const Spacer(),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _continue,
                      child: Text(
                        'Continue',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
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

class _LanguageOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _LanguageOption({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      color: AppColors.navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.poppins(
                      color: AppColors.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected
                    ? AppColors.primary
                    : Colors.transparent,
                border: Border.all(
                  color: selected
                      ? AppColors.primary
                      : AppColors.muted.withOpacity(0.45),
                ),
              ),
              child: selected
                  ? const Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 15,
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}