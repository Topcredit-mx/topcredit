---
name: form-creation
description: Use this skill when creating forms in React/Next.js applications using shadcn/ui components.
---

# Form Creation Skill

Use this skill when creating forms in React/Next.js applications using shadcn/ui components.

## Core Principles

### 1. Field Components vs Input Components

**CRITICAL DISTINCTION:**
- `Input` = The actual `<input>` element (stays unchanged)
- `Field` = A wrapper/organizer component that groups:
  - `FieldLabel` - Label with required indicator
  - `Input` - The actual input element (same Input component)
  - `FieldDescription` - Helper text
  - `FieldError` - Validation error messages

**Always use `Field` wrapper for form inputs**, not standalone `Input` components.

### 2. Custom Validation (Not HTML5)

**NEVER use HTML5 validation popups.** Always implement custom validation:

```tsx
// ✅ CORRECT
<form onSubmit={handleSubmit} noValidate>
  <Field data-invalid={touched.name && !!fieldErrors.name}>
    <FieldLabel htmlFor={nameId}>
      Name <span className="text-destructive">*</span>
    </FieldLabel>
    <Input
      aria-required="true"  // Accessibility, NOT HTML5 validation
      aria-invalid={touched.name && !!fieldErrors.name}
      // ... other props
    />
    {touched.name && fieldErrors.name && (
      <FieldError>{fieldErrors.name}</FieldError>
    )}
  </Field>
</form>

// ❌ WRONG
<form onSubmit={handleSubmit}>
  <Input required />  // Triggers browser popup
</form>
```

**Key points:**
- Use `noValidate` on `<form>` to disable HTML5 validation
- Use `aria-required="true"` instead of `required` (accessibility without HTML5)
- Use `aria-invalid` for accessibility
- Show custom error messages with `FieldError`

### 3. Validation State Management

**Always track two states:**
1. `touched` - Which fields have been interacted with
2. `fieldErrors` - Current validation errors

```tsx
const [touched, setTouched] = useState<Record<string, boolean>>({})
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
```

**Validation timing:**
- **On blur**: Mark field as touched and validate
- **On change** (if already touched): Re-validate to clear errors as user types
- **On submit**: Mark ALL fields as touched, validate all, prevent submission if invalid

```tsx
// On blur - mark touched and validate
onBlur={() => {
  setTouched((prev) => ({ ...prev, name: true }))
  validateField('name', formData.name)
}}

// On change - re-validate if already touched
onChange={(e) => {
  setFormData({ ...formData, name: e.target.value })
  if (touched.name) validateField('name', e.target.value)
}}

// On submit - mark all touched, validate all
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Mark all fields as touched
  setTouched({
    name: true,
    email: true,
    // ... all fields
  })
  
  // Validate all
  const nameValid = validateField('name', formData.name)
  const emailValid = validateField('email', formData.email)
  
  if (!nameValid || !emailValid) {
    return // Prevent submission
  }
  
  // Proceed with submission...
}
```

### 4. Field Structure Pattern

**Standard field structure:**

```tsx
<Field data-invalid={touched.fieldName && !!fieldErrors.fieldName}>
  <FieldLabel htmlFor={fieldId}>
    Label Text {required && <span className="text-destructive">*</span>}
  </FieldLabel>
  <Input
    id={fieldId}
    name="fieldName"
    value={formData.fieldName}
    onChange={handleChange}
    onBlur={handleBlur}
    aria-required={required ? "true" : undefined}
    aria-invalid={touched.fieldName && !!fieldErrors.fieldName}
    // ... other props
  />
  {helperText && <FieldDescription>{helperText}</FieldDescription>}
  {touched.fieldName && fieldErrors.fieldName && (
    <FieldError>{fieldErrors.fieldName}</FieldError>
  )}
</Field>
```

### 5. Unique IDs for Accessibility

**Always use `useId()` hook** for form field IDs:

```tsx
const nameId = useId()
const emailId = useId()

<FieldLabel htmlFor={nameId}>Name</FieldLabel>
<Input id={nameId} />
```

### 6. Form Submission Pattern

**Standard submission pattern:**

```tsx
const [isPending, startTransition] = useTransition()
const [error, setError] = useState<string | null>(null)

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  e.stopPropagation()
  setError(null)
  setFieldErrors({})
  
  // Mark all as touched
  setTouched({ /* all fields: true */ })
  
  // Validate all
  const allValid = /* validate all fields */
  if (!allValid) return
  
  // Submit with transition
  startTransition(async () => {
    const result = await submitAction(formData)
    if (result.success) {
      router.push('/success-path')
    } else {
      setError(result.error || 'Error message')
    }
  })
}

// In JSX
<form onSubmit={handleSubmit} noValidate>
  {error && <div className="error-banner">{error}</div>}
  {/* fields */}
  <Button type="submit" disabled={isPending}>
    {isPending ? 'Saving...' : 'Save'}
  </Button>
</form>
```

### 7. Required Field Indicators

**Always show visual indicator for required fields:**

```tsx
<FieldLabel>
  Name <span className="text-destructive">*</span>
</FieldLabel>
```

### 8. Invalid State Styling

**Field component automatically styles invalid state:**

- `data-invalid={true}` on `Field` → Label turns red
- `aria-invalid={true}` on `Input` → Screen reader announces invalid
- `FieldError` component → Shows error message in red

### 9. Type Conversions

**Handle client-side display vs server-side storage:**

```tsx
// Display as percentage (e.g., "2.50")
const [formData, setFormData] = useState({
  rate: company ? (Number.parseFloat(company.rate) * 100).toFixed(2) : '',
})

// Convert back to decimal for server (e.g., "0.0250")
const rateDecimal = (Number.parseFloat(formData.rate) / 100).toFixed(4)
```

### 10. Select Components

**For Radix UI Select components:**

```tsx
<Field>
  <FieldLabel htmlFor={selectId}>
    Frequency <span className="text-destructive">*</span>
  </FieldLabel>
  <Select
    value={formData.frequency}
    onValueChange={(value: 'monthly' | 'bi-monthly') =>
      setFormData({ ...formData, frequency: value })
    }
  >
    <SelectTrigger id={selectId}>
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="monthly">Monthly</SelectItem>
      <SelectItem value="bi-monthly">Bi-monthly</SelectItem>
    </SelectContent>
  </Select>
</Field>
```

## Checklist

When creating a form, ensure:

- [ ] Form has `noValidate` attribute
- [ ] All inputs wrapped in `Field` component
- [ ] Using `aria-required` instead of `required`
- [ ] Using `useId()` for all field IDs
- [ ] Tracking `touched` and `fieldErrors` state
- [ ] Validation on blur and submit
- [ ] Required fields show `*` indicator
- [ ] Error messages shown with `FieldError`
- [ ] Form submission uses `useTransition`
- [ ] Server errors displayed in error banner
- [ ] Type conversions handled (if needed)

## Common Mistakes to Avoid

1. ❌ Using `required` attribute → Causes HTML5 popup
2. ❌ Not using `noValidate` on form → Browser validates
3. ❌ Using `Input` without `Field` wrapper → Missing validation UI
4. ❌ Static IDs → Accessibility issues
5. ❌ Not tracking `touched` → Errors show too early
6. ❌ Validating only on submit → Poor UX
7. ❌ Not preventing default → Form submits with errors
