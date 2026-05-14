// Stylelint config for community.leadup.guru landings.
// Single source of truth used by .github/workflows/lint.yml.
//
// Rule overrides (LEA-1851):
//   - no-descending-specificity, selector-class-pattern, custom-property-pattern,
//     color-function-notation, alpha-value-notation: legacy carryovers from the
//     original CI inline config (kept for compatibility with existing CSS).
//   - property-no-vendor-prefix: we deliberately keep -webkit-* fallbacks for
//     backdrop-filter (Safari < 18), mask-image (Safari < 17.4),
//     overflow-scrolling, font-smoothing, background-clip, text-fill-color.
//     Revisit when Safari 18 becomes the project baseline.
//   - declaration-block-single-line-max-declarations: the file uses intentional
//     compact one-liners for short hover/active variants. Expanding all to
//     multi-line bloats the file without semantic benefit.
module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'color-function-notation': null,
    'alpha-value-notation': null,
    'property-no-vendor-prefix': null,
    'declaration-block-single-line-max-declarations': null,
  },
};
