import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Colors, RADIUS_CARD, RADIUS_INPUT, TAP_MIN } from "@/theme";
import { queryClient } from "@/utils/trpc";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return null;
}

export function SignUp() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email: value.email.trim(),
        password: value.password,
      });
      if (error) {
        throw new Error(error.message || "Failed to sign up");
      }
      formApi.reset();
      queryClient.refetchQueries();
    },
  });

  return (
    <View style={{ gap: 20 }}>
      <Text style={{ color: Colors.text1, fontSize: 28, fontFamily: "DMSans_600SemiBold" }}>
        Create Account
      </Text>

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: getErrorMessage(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => (
          <View style={{ gap: 16 }}>
            {validationError && (
              <Text style={{ color: Colors.red, fontSize: 13 }}>{validationError}</Text>
            )}

            <form.Field name="name">
              {(field) => (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: Colors.text2, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    Name
                  </Text>
                  <TextInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.text4}
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    style={{
                      backgroundColor: Colors.surface2,
                      borderRadius: RADIUS_INPUT,
                      padding: 14,
                      color: Colors.text1,
                      fontSize: 16,
                      fontFamily: "DMSans_400Regular",
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                  />
                </View>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: Colors.text2, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    Email
                  </Text>
                  <TextInput
                    ref={emailInputRef}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="email@example.com"
                    placeholderTextColor={Colors.text4}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    style={{
                      backgroundColor: Colors.surface2,
                      borderRadius: RADIUS_INPUT,
                      padding: 14,
                      color: Colors.text1,
                      fontSize: 16,
                      fontFamily: "DMSans_400Regular",
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                  />
                </View>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: Colors.text2, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
                    Password
                  </Text>
                  <TextInput
                    ref={passwordInputRef}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.text4}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={form.handleSubmit}
                    style={{
                      backgroundColor: Colors.surface2,
                      borderRadius: RADIUS_INPUT,
                      padding: 14,
                      color: Colors.text1,
                      fontSize: 16,
                      fontFamily: "DMSans_400Regular",
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                  />
                </View>
              )}
            </form.Field>

            <Pressable
              onPress={form.handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                backgroundColor: Colors.accent,
                borderRadius: RADIUS_CARD,
                minHeight: TAP_MIN,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                opacity: pressed || isSubmitting ? 0.7 : 1,
              })}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.bg} />
              ) : (
                <Text style={{ color: Colors.bg, fontSize: 16, fontFamily: "DMSans_600SemiBold" }}>
                  Create Account
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </form.Subscribe>
    </View>
  );
}
