import { Link } from "expo-router"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { GoogleIcon } from "@/components/brand/google-icon"
import { LogoMark, Wordmark } from "@/components/brand/logo"
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"
import { useGoogleSignIn } from "@/features/auth/use-google-sign-in"
import { WelcomeWaves } from "@/features/auth/welcome-waves"

const arrowIcon = { ios: "chevron.right", android: "chevron_right", web: "chevron_right" } as const

export default function Welcome() {
  const insets = useSafeAreaInsets()
  const { pending, signInWithGoogle } = useGoogleSignIn()

  return (
    <ScrollView
      className="flex-1 bg-background bg-radial-[65%_48%_at_38%_32%] from-background from-50% to-background-tint"
      contentContainerClassName="grow"
      contentInsetAdjustmentBehavior="never"
    >
      <View className="items-center px-6" style={{ paddingTop: insets.top + 45 }}>
        <LogoMark width={74} />
        <Wordmark width={116} className="mt-[19px] text-brand-ink" />

        <Text role="heading" className="mt-[43px] text-center text-[42px] font-extrabold leading-[45px] tracking-tight text-foreground">
          Your recovery starts here.
        </Text>
        <Text className="mt-[10px] px-[18px] text-center text-[20px] leading-[26px] text-muted-foreground">
          Create an account to save your progress and personalize your plan.
        </Text>

        <View className="mt-[38px] w-full gap-[17px]">
          <Button
            variant="outline"
            loading={pending}
            onPress={signInWithGoogle}
            className="min-h-[61px] rounded-full border-border bg-card px-[22px] shadow-[0_4px_10px_rgba(15,23,42,0.1)]"
            contentClassName="flex-1 justify-between"
          >
            <View className="w-[36px] items-start">
              <GoogleIcon size={28} />
            </View>
            <ButtonText className="flex-1 text-[20px]">Continue with Google</ButtonText>
            <View className="w-[36px] items-end">
              <ButtonIcon name={arrowIcon} size={16} weight="medium" className="text-muted-foreground opacity-60" />
            </View>
          </Button>
        </View>

        <Text className="mt-[36px] text-center text-[18px] text-soft-foreground">
          Already have an account?
          {" "}
          {/* Google sign-in handles new and returning users alike. */}
          <Text role="link" onPress={signInWithGoogle} className="font-semibold text-accent underline">
            Sign in
          </Text>
        </Text>
      </View>
      <View className="mt-[10px] grow">
        <WelcomeWaves className="grow" />
        <Text
          className="absolute inset-x-0 px-10 text-center text-[14px] leading-[20px] text-soft-foreground"
          style={{ bottom: insets.bottom + 8 }}
        >
          By continuing, you agree to our
          {"\n"}
          <Link
            href="/terms"
            className="font-medium text-foreground"
          >
            Terms of Service
          </Link>
          {" "}
          and
          {" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </Text>
      </View>
    </ScrollView>
  )
}
