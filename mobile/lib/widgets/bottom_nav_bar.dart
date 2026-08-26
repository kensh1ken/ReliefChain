import 'package:flutter/material.dart';
import 'package:pixelarticons/pixel.dart';

   const Color background = Color(0xFF1E1F24);
   const Color accent = Color(0xFFA970FF);
   const Color inactive = Color(0xFF7A7C88);
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
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
        child: Container(
          height: 76,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(
              color: Colors.white.withOpacity(0.05),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 25,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              _NavItem(
                icon: Pixel.home,
                label: 'Home',
                index: 0,
                selectedIndex: selectedIndex,
                onTap: onTap,
              ),
              _NavItem(
                icon: Pixel.wallet,
                label: 'Payments',
                index: 1,
                selectedIndex: selectedIndex,
                onTap: onTap,
              ),
              _NavItem(
                icon: Pixel.check,
                label: 'Eligibility',
                index: 2,
                selectedIndex: selectedIndex,
                onTap: onTap,
              ),
              _NavItem(
                icon: Pixel.menu,
                label: 'More',
                index: 3,
                selectedIndex: selectedIndex,
                onTap: onTap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final int index;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.index,
    required this.selectedIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool selected = selectedIndex == index;

    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => onTap(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: selected
                      ? accent.withOpacity(0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                    color: selected
                        ? accent
                        : Colors.transparent,
                  ),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: accent.withOpacity(0.18),
                            blurRadius: 18,
                          ),
                        ]
                      : [],
                ),
                child: Icon(
                  icon,
                  size: 24,
                  color: selected ? accent : inactive,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}