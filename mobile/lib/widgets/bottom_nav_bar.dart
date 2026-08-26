import 'package:flutter/material.dart';
import 'package:reliefchain/utils/colors.dart';

class ReliefChainNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const ReliefChainNavBar({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: Container(
          height: 78,
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 18,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              _NavItem(
                index: 0,
                selectedIndex: selectedIndex,
                onTap: onTap,
                label: 'Home',
                selectedIcon: Icons.home_rounded,
                unselectedIcon: Icons.home_outlined,
              ),
              _NavItem(
                index: 1,
                selectedIndex: selectedIndex,
                onTap: onTap,
                label: 'Payments',
                selectedIcon: Icons.account_balance_wallet_rounded,
                unselectedIcon:
                    Icons.account_balance_wallet_outlined,
              ),
              _NavItem(
                index: 2,
                selectedIndex: selectedIndex,
                onTap: onTap,
                label: 'Eligibility',
                selectedIcon: Icons.verified_rounded,
                unselectedIcon: Icons.verified_outlined,
              ),
              _NavItem(
                index: 3,
                selectedIndex: selectedIndex,
                onTap: onTap,
                label: 'More',
                selectedIcon: Icons.more_horiz_rounded,
                unselectedIcon: Icons.more_horiz_rounded,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final int selectedIndex;
  final ValueChanged<int> onTap;
  final String label;
  final IconData selectedIcon;
  final IconData unselectedIcon;

  const _NavItem({
    required this.index,
    required this.selectedIndex,
    required this.onTap,
    required this.label,
    required this.selectedIcon,
    required this.unselectedIcon,
  });

  @override
  Widget build(BuildContext context) {
    final selected = index == selectedIndex;

    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        borderRadius: BorderRadius.circular(20),
        splashColor: AppColors.primary.withOpacity(0.08),
        highlightColor: Colors.transparent,
        child: SizedBox(
          height: double.infinity,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            padding: const EdgeInsets.only(
              top: 9,
              bottom: 7,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 160),
                  child: Icon(
                    selected
                        ? selectedIcon
                        : unselectedIcon,
                    key: ValueKey(selected),
                    size: 24,
                    color: selected
                        ? AppColors.primary
                        : AppColors.muted,
                  ),
                ),

                const SizedBox(height: 4),

                AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 160),
                  style: TextStyle(
                    color: selected
                        ? AppColors.primary
                        : AppColors.muted,
                    fontSize: 11.5,
                    fontWeight: selected
                        ? FontWeight.w700
                        : FontWeight.w500,
                  ),
                  child: Text(label),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}