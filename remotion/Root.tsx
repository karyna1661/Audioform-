import { Composition } from "remotion"
import { AudioformBuildDemo } from "./compositions/AudioformBuildDemo"

export const RemotionRoot = () => {
  return (
    <Composition
      id="AudioformBuildDemo"
      component={AudioformBuildDemo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}
