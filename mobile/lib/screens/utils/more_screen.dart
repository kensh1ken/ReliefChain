import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/screens/about/about_screen.dart';
import 'package:reliefchain/screens/help/help_support_screen.dart';
import 'package:reliefchain/screens/user/profile_screen.dart';
import 'package:reliefchain/screens/utils/settings_screen.dart';
import 'package:reliefchain/utils/colors.dart';

import '../../providers/auth_provider.dart';
import '../../providers/beneficiary_provider.dart';
import '../auth/login_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

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
    return Container(
      color: AppColors.background,
      child: SafeArea(
        bottom: false,
        child: Consumer<BeneficiaryProvider>(
          builder: (context, provider, _) {
            final beneficiary = provider.beneficiary;
            final name = beneficiary?.name ?? 'Beneficiary';

            final phone =
                context.read<AuthProvider>().phone ?? '';

            return ListView(
              padding: const EdgeInsets.fromLTRB(
                18,
                10,
                18,
                28,
              ),
              children: [
                _Header(),

                const SizedBox(height: 18),

                _ProfileHeader(
                  name: name,
                  phone: phone,
                ),

                const SizedBox(height: 20),

                _MenuCard(
                  children: [
                    _MenuItem(
                      icon: Icons.person_outline_rounded,
                      title: 'Profile',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const ProfileScreen(),
                          ),
                        );
                      },
                    ),
                    const _MenuDivider(),
                    _MenuItem(
                      icon: Icons.settings_outlined,
                      title: 'Settings',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const SettingsScreen(),
                          ),
                        );
                      },
                    ),
                    const _MenuDivider(),
                    _MenuItem(
                      icon: Icons.refresh_rounded,
                      title: 'Refresh Data',
                      onTap: () async {
                        await context
                            .read<BeneficiaryProvider>()
                            .refresh();
                      },
                    ),
                    const _MenuDivider(),
                    _MenuItem(
                      icon: Icons.help_outline_rounded,
                      title: 'Help & Support',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const HelpSupportScreen(),
                          ),
                        );
                      },
                    ),
                    const _MenuDivider(),
                    _MenuItem(
                      icon: Icons.info_outline_rounded,
                      title: 'About ReliefChain',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                const AboutScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                _LogoutCard(
                  onTap: () => _logout(context),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const _HeaderButton(
          icon: Icons.menu_rounded,
        ),
        const Spacer(),
        Text(
          'More',
          style: GoogleFonts.poppins(
            color: AppColors.navy,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        const Spacer(),
        const SizedBox(width: 42),
      ],
    );
  }
}

class _HeaderButton extends StatelessWidget {
  final IconData icon;

  const _HeaderButton({
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 42,
      height: 42,
      child: Icon(
        icon,
        color: AppColors.navy,
        size: 22,
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String phone;

  const _ProfileHeader({
    required this.name,
    required this.phone,
  });

  @override
  Widget build(BuildContext context) {
    final maskedPhone = _maskPhone(phone);

    return Row(
      children: [
        Container(
          width: 58,
          height: 58,
          decoration: const BoxDecoration(
            color: Color(0xFFE2E8F0),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.person_rounded,
            color: Color(0xFF94A3B8),
            size: 34,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  color: AppColors.navy,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                maskedPhone,
                style: GoogleFonts.poppins(
                  color: AppColors.muted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _maskPhone(String phone) {
    if (phone.length < 6) {
      return phone;
    }

    final lastTwo = phone.substring(phone.length - 2);
    return '+91 ••••••••$lastTwo';
  }
}

class _MenuCard extends StatelessWidget {
  final List<Widget> children;

  const _MenuCard({
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: children,
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? trailingText;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.title,
    required this.onTap,
  }) : trailingText = null;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: 56,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 14,
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  color: AppColors.navy,
                  size: 21,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.poppins(
                      color: AppColors.navy,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (trailingText != null)
                  Text(
                    trailingText!,
                    style: GoogleFonts.poppins(
                      color: AppColors.muted,
                      fontSize: 11,
                    ),
                  ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.muted,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 49),
      child: Divider(
        height: 1,
        color: AppColors.divider,
      ),
    );
  }
}

class _LogoutCard extends StatelessWidget {
  final VoidCallback onTap;

  const _LogoutCard({
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          height: 54,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 14,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.logout_rounded,
                  color: Color(0xFFC73E51),
                  size: 21,
                ),
                const SizedBox(width: 14),
                Text(
                  'Logout',
                  style: GoogleFonts.poppins(
                    color: const Color(0xFFC73E51),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}