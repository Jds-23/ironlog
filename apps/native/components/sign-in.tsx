import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { Colors, RADIUS_CARD, RADIUS_INPUT, TAP_MIN } from "@/theme";
import { signInSchema } from "@/utils/auth-validators";
import { queryClient } from "@/utils/trpc";

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

function SignIn() {
  const passwordInputRef = useRef<TextInput>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
      });
      if (error) {
        throw new Error(error.message || "Failed to sign in");
      }
      formApi.reset();
      queryClient.refetchQueries();
    },
  });

  return (
    <View style={{ gap: 20 }}>
      <Text style={{ color: Colors.text1, fontSize: 28, fontFamily: "DMSans_600SemiBold" }}>
        Sign In
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

            <form.Field name="email">
              {(field) => (
                <View style={{ gap: 6 }}>
                  <Text
                    style={{ color: Colors.text2, fontSize: 13, fontFamily: "DMSans_500Medium" }}
                  >
                    Email
                  </Text>
                  <TextInput
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
                  <Text
                    style={{ color: Colors.text2, fontSize: 13, fontFamily: "DMSans_500Medium" }}
                  >
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
                    autoComplete="password"
                    textContentType="password"
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
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </form.Subscribe>
    </View>
  );
}

export { SignIn };
