import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'package:reliefchain/l10n/app_localizations.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/tts_button.dart';

import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../auth/login_screen.dart';
import '../language/language_select_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthProvider>().logout();

    if (!context.mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings =
        context.watch<SettingsProvider>();

    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            20,
            10,
            20,
            30,
          ),
          children: [
            _Header(
              l10n: l10n,
            ),

            const SizedBox(height: 24),

            _SectionTitle(
              title: l10n.settingsAccessibility,
            ),

            const SizedBox(height: 10),

            _SettingsCard(
              children: [
                _SwitchItem(
                  icon: Icons.volume_up_outlined,
                  title: l10n.textToSpeech,
                  subtitle:
                      l10n.readImportantInformation,
                  value: settings.ttsEnabled,
                  onChanged:
                      settings.setTtsEnabled,
                ),

                const _Divider(),

                _SwitchItem(
                  icon: Icons.text_fields_rounded,
                  title: l10n.largerText,
                  subtitle: l10n.useLargerText,
                  value:
                      settings.largeTextEnabled,
                  onChanged:
                      settings.setLargeTextEnabled,
                ),
              ],
            ),

            const SizedBox(height: 22),

            _SectionTitle(
              title: l10n.language,
            ),

            const SizedBox(height: 10),

            _SettingsCard(
              children: [
                _NavigationItem(
                  icon: Icons.language_rounded,
                  title: l10n.language,
                  subtitle:
                      settings.language == 'hi'
                          ? l10n.hindi
                          : l10n.english,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            const LanguageSelectScreen(
                          fromSettings: true,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),

            const SizedBox(height: 22),

            _SectionTitle(
              title: l10n.privacy,
            ),

            const SizedBox(height: 10),

            _SettingsCard(
              children: [
                _NavigationItem(
                  icon:
                      Icons.privacy_tip_outlined,
                  title:
                      l10n.privacyInformation,
                  onTap: () =>
                      _showPrivacyDialog(context),
                ),
              ],
            ),

            const SizedBox(height: 22),

            _LogoutButton(
              title: l10n.logout,
              onTap: () => _logout(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showPrivacyDialog(
    BuildContext context,
  ) {
    final l10n = AppLocalizations.of(context)!;

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.white,
          title: Text(
            l10n.privacy,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: Text(
            l10n.privacyMessage,
            style: GoogleFonts.poppins(
              color: AppColors.muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
              child: Text(
                l10n.close,
                style: GoogleFonts.poppins(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final AppLocalizations l10n;

  const _Header({
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: () =>
              Navigator.of(context).pop(),
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
        ),

        Expanded(
          child: Text(
            l10n.settings,
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              color: AppColors.navy,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),

        TtsButton(
          text:
              '${l10n.settings}. '
              '${l10n.settingsAccessibility}. '
              '${l10n.textToSpeech}. '
              '${l10n.largerText}. '
              '${l10n.language}. '
              '${l10n.privacyInformation}. '
              '${l10n.logout}.',
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        color: AppColors.navy,
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;

  const _SettingsCard({
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: children,
      ),
    );
  }
}

class _SwitchItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        14,
        12,
        10,
        12,
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius:
                  BorderRadius.circular(11),
            ),
            child: Icon(
              icon,
              color: AppColors.primary,
              size: 20,
            ),
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.poppins(
                    color: AppColors.navy,
                    fontSize: 12,
                    fontWeight:
                        FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 2),

                Text(
                  subtitle,
                  style: GoogleFonts.poppins(
                    color: AppColors.muted,
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),

          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}

class _NavigationItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _NavigationItem({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(16),
        child: Padding(
          padding:
              const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color:
                      AppColors.primaryLight,
                  borderRadius:
                      BorderRadius.circular(11),
                ),
                child: Icon(
                  icon,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),

              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style:
                          GoogleFonts.poppins(
                        color:
                            AppColors.navy,
                        fontSize: 12,
                        fontWeight:
                            FontWeight.w600,
                      ),
                    ),

                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style:
                            GoogleFonts.poppins(
                          color:
                              AppColors.muted,
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.muted,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 64),
      child: Divider(
        height: 1,
        color: AppColors.divider,
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const _LogoutButton({
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius:
          BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(14),
        child: SizedBox(
          height: 54,
          child: Row(
            children: [
              const SizedBox(width: 15),

              const Icon(
                Icons.logout_rounded,
                color: AppColors.failed,
                size: 21,
              ),

              const SizedBox(width: 12),

              Text(
                title,
                style: GoogleFonts.poppins(
                  color: AppColors.failed,
                  fontSize: 12,
                  fontWeight:
                      FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}