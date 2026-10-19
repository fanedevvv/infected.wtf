import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

/**
 * Props for the AuthForm component.
 */
interface AuthFormProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * The source URL or base64 string for the company logo.
   */
  logoSrc?: string;
  /**
   * Alt text for the company logo for accessibility.
   */
  logoAlt?: string;
  /**
   * Rendered instead of the image when there is no `logoSrc` (e.g. a text wordmark).
   */
  logo?: React.ReactNode;
  /**
   * The main title of the form.
   */
  title: React.ReactNode;
  /**
   * A short description or subtitle displayed below the title.
   */
  description?: React.ReactNode;
  /**
   * Form fields rendered at the top of the card body (e.g. credentials).
   */
  children?: React.ReactNode;
  /**
   * The primary call-to-action button (e.g., social login).
   */
  primaryAction?: AuthAction;
  /**
   * An array of secondary action buttons.
   */
  secondaryActions?: AuthAction[];
  /**
   * An optional action for skipping the login process.
   */
  skipAction?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Custom content to be displayed in the footer area.
   */
  footerContent?: React.ReactNode;
  /**
   * Extra classes for the outer wrapper (the card itself takes `className`).
   */
  wrapperClassName?: string;
}

/**
 * A reusable authentication form component built with shadcn/ui.
 * It supports various providers, a customizable header, and animations.
 * Adapted for infected.wtf: optional logo image, a `children` slot for form fields,
 * and an optional primary action.
 */
const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  (
    {
      className,
      wrapperClassName,
      logoSrc,
      logoAlt = "Company Logo",
      logo,
      title,
      description,
      children,
      primaryAction,
      secondaryActions,
      skipAction,
      footerContent,
      ...props
    },
    ref
  ) => {
    const hasActions = !!primaryAction || (secondaryActions?.length ?? 0) > 0;
    return (
      <div className={cn("flex flex-col items-center justify-center", wrapperClassName)}>
        <Card
          ref={ref}
          className={cn(
            "w-full max-w-sm",
            // Entrance Animation from tw-animate-css
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500",
            className
          )}
          {...props}
        >
          <CardHeader className="text-center">
            {(logoSrc || logo) && (
              <div className="mb-4 flex justify-center ">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt={logoAlt} className="h-12 w-12 object-contain rounded-[4px]" />
                ) : (
                  logo
                )}
              </div>
            )}
            <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-4">
            {children}

            {/* Primary Action Button */}
            {primaryAction && (
              <Button onClick={primaryAction.onClick} className="w-full transition-transform hover:scale-[1.03]">
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )}

            {/* "OR" separator */}
            {children && hasActions && secondaryActions && secondaryActions.length > 0 && (
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            )}

            {/* Secondary Action Buttons */}
            {secondaryActions && secondaryActions.length > 0 && (
              <div className="grid gap-2">
                {secondaryActions.map((action, index) => (
                  <Button key={index} type="button" variant="secondary" className="w-full transition-transform hover:scale-[1.03]" onClick={action.onClick}>
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>

          {/* Skip Action Button */}
          {skipAction && (
            <CardFooter className="flex flex-col">
              <Button type="button" variant="outline" className="w-full transition-transform hover:scale-[1.03]" onClick={skipAction.onClick}>
                {skipAction.label}
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Footer */}
        {footerContent && (
          <div className="mt-6 w-full max-w-sm px-8 text-center text-sm text-muted-foreground animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500 [animation-delay:200ms]">
            {footerContent}
          </div>
        )}
      </div>
    );
  }
);
AuthForm.displayName = "AuthForm";

export { AuthForm };
