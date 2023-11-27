<template>
    <Form
        :model="formState"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
        autocomplete="off"
        @finish="onFinish"
    >
        <FormItem
            label="UID"
            name="uid"
            :rules="[{ required: true, message: '请输入uid' }]"
        >
            <Input v-model:value="formState.uid" />
        </FormItem>

        <FormItem :wrapper-col="{ offset: 8, span: 16 }">
            <Button type="primary" html-type="submit">保存</Button>
        </FormItem>
    </Form>
</template>

<script setup lang="ts">
    import { reactive, watch } from 'vue';
    import { Button, Form, FormItem, Input } from 'ant-design-vue';

    const emit = defineEmits(['success']);
    const props = defineProps<{
        uid?: string
    }>();

    watch(
        () => props.uid,
        (val) => {
            formState.uid = val;
            // TODO：如果UID存在，则调用接口获取此uid的信息
        }
    );

    const formState = reactive<FormState>({
        uid: '',
    });

    // 保存
    const onFinish = (values: any) => {
        emit('success', values.uid)
    };
  
</script>
  