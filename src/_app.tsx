import { AppsInToss } from '@apps-in-toss/web-framework';
import { PropsWithChildren } from 'react';

function AppContainer({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export default AppsInToss.registerApp(AppContainer, {});
