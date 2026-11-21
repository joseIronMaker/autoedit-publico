import {Config} from '@remotion/cli/config';

// PNG sin pérdida: sin shimmer/banding en los degradados neón (JPEG parpadea).
Config.setVideoImageFormat('png');
Config.setConcurrency(6);
Config.setOverwriteOutput(true);
Config.setCrf(16);
